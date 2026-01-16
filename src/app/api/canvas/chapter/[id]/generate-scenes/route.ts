/**
 * Canvas Chapter Generate Scenes API
 * POST /api/canvas/chapter/[id]/generate-scenes - 生成场景图
 *
 * ✅ 已集成 novel-backend 场景生成服务
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
    logInfo("开始生成场景图", {
      endpoint: "/api/canvas/chapter/[id]/generate-scenes",
      chapterId,
      userId: payload.userId,
    });

    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      include: {
        timeline: true,
        script_segments: {
          include: {
            shot_designs: true,
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

    const allShots = timelineChapter.script_segments.flatMap(
      (s) => s.shot_designs
    );
    if (allShots.length === 0) {
      return NextResponse.json(
        { error: "请先生成镜头设计" },
        { status: 400 }
      );
    }

    logInfo("镜头设计获取成功", {
      chapterId,
      shotCount: allShots.length,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { scene_status: "generating" },
    });

    // 调用 novel-backend 场景生成服务
    const client = getNovelBackendClient();

    const sceneResult = await client.generateScenes({
      shots: allShots.map(shot => ({
        shot_id: shot.id,
        camera_angle: shot.camera_angle,
        shot_size: shot.shot_size,
        shot_description: shot.shot_description,
        prompt: shot.prompt,
        character_ids: shot.character_ids,
      })),
      style: "manga", // TODO: 从用户设置获取
    });

    if (!sceneResult.success || sceneResult.scenes.length === 0) {
      throw new Error("场景图生成返回空结果");
    }

    logInfo("场景图生成完成", {
      chapterId,
      sceneCount: sceneResult.scenes.length,
    });

    // 保存场景图到数据库
    const createdScenes = await Promise.all(
      sceneResult.scenes.map((scene) =>
        prisma.sceneImage.create({
          data: {
            shot_design_id: scene.shot_id,
            image_url: scene.image_url,
            generation_prompt: scene.generation_prompt,
            status: scene.status,
          },
        })
      )
    );

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        scene_status: "completed",
        scene_image_count: createdScenes.length,
      },
    });

    const durationMs = Date.now() - startedAt;
    logInfo("场景图生成成功", {
      chapterId,
      userId: payload.userId,
      sceneCount: createdScenes.length,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      scenes: createdScenes,
      metadata: {
        scene_count: createdScenes.length,
        duration_ms: durationMs,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logError("生成场景图失败", error, {
      chapterId,
      userId: payload.userId,
      durationMs,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { scene_status: "error" },
    });

    if (error instanceof NovelBackendError) {
      return NextResponse.json(
        {
          error: "场景图生成失败",
          detail: error.message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: "生成场景图失败",
        detail: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
