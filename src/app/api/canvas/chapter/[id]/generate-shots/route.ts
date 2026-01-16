/**
 * Canvas Chapter Generate Shots API
 * POST /api/canvas/chapter/[id]/generate-shots - 生成镜头设计
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
    logInfo("开始生成镜头", {
      endpoint: "/api/canvas/chapter/[id]/generate-shots",
      chapterId,
      userId: payload.userId,
    });

    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      include: {
        timeline: true,
        script_segments: { orderBy: { segment_order: "asc" } },
      },
    });

    if (!timelineChapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (timelineChapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    if (timelineChapter.script_segments.length === 0) {
      return NextResponse.json(
        { error: "请先生成剧本" },
        { status: 400 }
      );
    }

    logInfo("剧本片段获取成功", {
      chapterId,
      segmentCount: timelineChapter.script_segments.length,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { shot_status: "generating" },
    });

    // 调用 novel-backend 的镜头规划服务（并行优化）
    const client = getNovelBackendClient();
    let totalShots = 0;
    const allShots = [];

    logInfo("开始并行生成镜头", {
      chapterId,
      segmentCount: timelineChapter.script_segments.length,
    });

    // 并行为所有剧本片段生成镜头（性能优化：从串行改为并行）
    const shotResults = await Promise.all(
      timelineChapter.script_segments.map(async (segment) => {
        try {
          logInfo("为剧本片段生成镜头", {
            chapterId,
            segmentId: segment.id,
            segmentOrder: segment.segment_order,
          });

          const planResult = await client.planShots({
            script_content: segment.content,
            scene_description: segment.scene_description,
            character_actions: segment.character_actions,
            available_characters: [], // TODO: 从数据库获取可用角色列表
          });

          if (!planResult.success || planResult.shots.length === 0) {
            logError("镜头规划返回空结果", new Error("Empty shots result"), {
              segmentId: segment.id,
            });
            return { segment, shots: [] };
          }

          logInfo("镜头规划完成", {
            segmentId: segment.id,
            shotCount: planResult.shots.length,
          });

          return { segment, shots: planResult.shots };
        } catch (error) {
          logError("片段镜头生成失败", error, {
            segmentId: segment.id,
          });
          return { segment, shots: [] };
        }
      })
    );

    // 批量创建镜头记录
    for (const { segment, shots } of shotResults) {
      if (shots.length === 0) continue;

      const createdShots = await Promise.all(
        shots.map((shot) =>
          prisma.shotDesign.create({
            data: {
              script_segment_id: segment.id,
              shot_order: shot.shot_order,
              camera_angle: shot.camera_angle,
              shot_size: shot.shot_size,
              panel_type: "medium", // 默认类型
              shot_description: shot.action_description,
              composition_hint: shot.visual_notes || "",
              prompt: `${shot.camera_angle}, ${shot.shot_size}`,
              negative_prompt: "blurry, low quality, distorted",
              character_ids: shot.character_focus ? [shot.character_focus] : [],
            },
          })
        )
      );

      allShots.push(...createdShots);
      totalShots += createdShots.length;
    }

    // 更新章节状态
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        shot_status: "completed",
        shot_count: totalShots,
      },
    });

    // 更新时间线统计
    await prisma.canvasTimeline.update({
      where: { id: timelineChapter.timeline_id },
      data: {
        total_shots: { increment: totalShots },
      },
    });

    const durationMs = Date.now() - startedAt;
    logInfo("镜头生成成功", {
      chapterId,
      userId: payload.userId,
      shotCount: totalShots,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      shots: allShots,
      metadata: {
        shot_count: totalShots,
        segment_count: timelineChapter.script_segments.length,
        duration_ms: durationMs,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logError("生成镜头失败", error, {
      chapterId,
      userId: payload.userId,
      durationMs,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { shot_status: "error" },
    });

    if (error instanceof NovelBackendError) {
      return NextResponse.json(
        {
          error: "镜头生成失败",
          detail: error.message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: "生成镜头失败",
        detail: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
