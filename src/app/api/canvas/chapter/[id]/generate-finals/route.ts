/**
 * Canvas Chapter Generate Finals API
 * POST /api/canvas/chapter/[id]/generate-finals - 生成最终漫画图
 *
 * ✅ 已集成 novel-backend 漫画图生成服务
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNovelBackendClient, NovelBackendError } from "@/lib/novel-backend-client";
import { logInfo, logError } from "@/lib/api-logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const startedAt = Date.now();
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id: chapterId } = await params;

  try {
    logInfo("开始生成最终漫画图", {
      endpoint: "/api/canvas/chapter/[id]/generate-finals",
      chapterId,
      userId: payload.userId,
    });

    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      include: {
        timeline: true,
        script_segments: {
          include: {
            shot_designs: {
              include: {
                scene_images: true,
                script_segment: true,
              },
            },
          },
        },
      },
    });

    if (!timelineChapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (timelineChapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const allScenes = timelineChapter.script_segments.flatMap((s) =>
      s.shot_designs.flatMap((d) => d.scene_images)
    );

    if (allScenes.length === 0) {
      return NextResponse.json(
        { error: "请先生成场景图" },
        { status: 400 }
      );
    }

    logInfo("场景图获取成功", {
      chapterId,
      sceneCount: allScenes.length,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { final_status: "generating" },
    });

    // 调用 novel-backend 漫画图生成服务
    const client = getNovelBackendClient();

    // 构建场景输入数据（包含对话信息）
    const sceneInputs = timelineChapter.script_segments.flatMap((segment) =>
      segment.shot_designs.flatMap((shotDesign) =>
        shotDesign.scene_images.map((sceneImage) => ({
          scene_id: sceneImage.id,
          shot_id: shotDesign.id,
          image_url: sceneImage.image_url,
          dialogue: segment.dialogue,
          character_names: [], // TODO: 从 character_ids 获取角色名称
        }))
      )
    );

    const finalsResult = await client.generateFinals({
      scenes: sceneInputs,
      comic_style: "manga", // TODO: 从用户设置获取
      add_speech_bubbles: true,
    });

    if (!finalsResult.success || finalsResult.panels.length === 0) {
      throw new Error("漫画图生成返回空结果");
    }

    logInfo("漫画图生成完成", {
      chapterId,
      panelCount: finalsResult.panels.length,
    });

    // 保存漫画图到数据库
    const createdPanels = await Promise.all(
      finalsResult.panels.map((panel) =>
        prisma.comicPanelResult.create({
          data: {
            shot_design_id: panel.shot_id,
            scene_image_id: panel.scene_id,
            image_url: panel.image_url,
            generation_prompt: panel.generation_prompt,
            status: panel.status,
          },
        })
      )
    );

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        final_status: "completed",
        final_image_count: createdPanels.length,
      },
    });

    // 更新时间线统计
    await prisma.canvasTimeline.update({
      where: { id: timelineChapter.timeline_id },
      data: {
        total_images: { increment: createdPanels.length },
        completed_chapters: { increment: 1 },
      },
    });

    const durationMs = Date.now() - startedAt;
    logInfo("最终漫画图生成成功", {
      chapterId,
      userId: payload.userId,
      panelCount: createdPanels.length,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      panels: createdPanels,
      metadata: {
        panel_count: createdPanels.length,
        duration_ms: durationMs,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logError("生成最终图失败", error, {
      chapterId,
      userId: payload.userId,
      durationMs,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { final_status: "error" },
    });

    if (error instanceof NovelBackendError) {
      return NextResponse.json(
        {
          error: "漫画图生成失败",
          detail: error.message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: "生成最终图失败",
        detail: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
