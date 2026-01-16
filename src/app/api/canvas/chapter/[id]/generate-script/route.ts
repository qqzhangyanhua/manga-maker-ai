/**
 * Canvas Chapter Generation API
 * POST /api/canvas/chapter/[id]/generate-script - 生成剧本
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
    logInfo("开始生成剧本", {
      endpoint: "/api/canvas/chapter/[id]/generate-script",
      chapterId,
      userId: payload.userId,
    });

    // 获取章节信息
    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      include: {
        timeline: true,
      },
    });

    if (!timelineChapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (timelineChapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    // 获取小说章节内容
    const novelChapter = await prisma.novelChapter.findFirst({
      where: {
        project_id: timelineChapter.timeline.novel_project_id,
        chapter_number: timelineChapter.chapter_number,
      },
    });

    const chapterContent = novelChapter?.content || "";

    if (!chapterContent || chapterContent.trim().length === 0) {
      logError("章节内容为空", new Error("Empty chapter content"), {
        chapterId,
        timelineId: timelineChapter.timeline_id,
      });
      return NextResponse.json(
        { error: "章节内容为空，无法生成剧本" },
        { status: 400 }
      );
    }

    logInfo("章节内容获取成功", {
      chapterId,
      contentLength: chapterContent.length,
      chapterNumber: timelineChapter.chapter_number,
    });

    // 更新状态为生成中
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { script_status: "generating" },
    });

    // 调用 novel-backend 的剧本分析服务
    const client = getNovelBackendClient();

    // 健康检查（可选，用于调试）
    const isHealthy = await client.healthCheck();
    if (!isHealthy) {
      logError("novel-backend 服务不可用", new Error("Service unavailable"), {
        chapterId,
      });
      throw new Error("novel-backend 服务不可用，请稍后重试");
    }

    const analyzeResult = await client.analyzeScript({
      chapter_content: chapterContent,
      chapter_number: timelineChapter.chapter_number,
    });

    if (!analyzeResult.success || analyzeResult.segments.length === 0) {
      throw new Error("剧本分析返回空结果");
    }

    logInfo("剧本分析完成", {
      chapterId,
      segmentCount: analyzeResult.segments.length,
    });

    // 创建剧本片段（批量插入）
    const createdSegments = await Promise.all(
      analyzeResult.segments.map((segment) =>
        prisma.scriptSegment.create({
          data: {
            timeline_chapter_id: chapterId,
            segment_order: segment.segment_order,
            content: segment.content,
            scene_description: segment.scene_description,
            character_actions: segment.character_actions,
            dialogue: segment.dialogue,
            estimated_duration: segment.estimated_duration,
            emotion_tone: segment.emotion_tone,
            source_text_start: segment.source_text_start || 0,
            source_text_end: segment.source_text_end || chapterContent.length,
          },
        })
      )
    );

    // 更新状态为完成
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        script_status: "completed",
        script_segment_count: createdSegments.length,
      },
    });

    const durationMs = Date.now() - startedAt;
    logInfo("剧本生成成功", {
      chapterId,
      userId: payload.userId,
      segmentCount: createdSegments.length,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      segments: createdSegments,
      metadata: {
        segment_count: createdSegments.length,
        duration_ms: durationMs,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logError("生成剧本失败", error, {
      chapterId,
      userId: payload.userId,
      durationMs,
    });

    // 更新状态为错误
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { script_status: "error" },
    });

    // 区分不同类型的错误
    if (error instanceof NovelBackendError) {
      return NextResponse.json(
        {
          error: "剧本生成失败",
          detail: error.message,
        },
        { status: 502 } // Bad Gateway
      );
    }

    return NextResponse.json(
      {
        error: "生成剧本失败",
        detail: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
