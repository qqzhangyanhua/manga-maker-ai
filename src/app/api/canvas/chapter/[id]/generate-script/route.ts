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
import { createChapterScriptSegments } from "@/lib/script-segment";

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

    // 获取时间线章节信息
    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
    });

    if (!timelineChapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    // 验证时间线所有权
    const timeline = await prisma.canvasTimeline.findUnique({
      where: { id: timelineChapter.timeline_id },
      select: { user_id: true },
    });

    if (!timeline || timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    // 直接通过 chapter_id 获取小说章节内容（性能优化：使用主键查询）
    const novelChapter = await prisma.novelChapter.findUnique({
      where: { id: timelineChapter.chapter_id },
      select: {
        id: true,
        content: true,
        status: true,
        title: true,
        chapter_number: true,
        word_count: true,
        project_id: true,
      },
    });

    if (!novelChapter) {
      logError("小说章节不存在", new Error("Novel chapter not found"), {
        chapterId,
        timelineChapterId: timelineChapter.id,
        novelChapterId: timelineChapter.chapter_id,
      });
      return NextResponse.json(
        {
          error: "小说章节不存在",
          suggestion: "该章节可能已被删除，请重新选择章节",
        },
        { status: 404 }
      );
    }

    let chapterContent = novelChapter.content || "";

    // Fallback: 如果 NovelChapter.content 为空，尝试从 NovelProject.outlines 获取
    if (!chapterContent || chapterContent.trim().length === 0) {
      logInfo("NovelChapter.content 为空，尝试从 NovelProject.outlines 获取", {
        chapterId,
        novelChapterId: novelChapter.id,
        chapterNumber: novelChapter.chapter_number,
      });

      const project = await prisma.novelProject.findUnique({
        where: { id: novelChapter.project_id },
        select: { outlines: true },
      });

      if (project?.outlines) {
        const outlines = project.outlines as Array<{
          chapterNumber?: number;
          chapter_number?: number;
          title?: string;
          outline?: string;
          content?: string;
        }>;

        // 查找匹配的 outline (可能用 chapterNumber 或 chapter_number)
        const matchedOutline = outlines.find(
          (o) =>
            (o.chapterNumber === novelChapter.chapter_number ||
              o.chapter_number === novelChapter.chapter_number)
        );

        if (matchedOutline?.content) {
          chapterContent = matchedOutline.content;
          logInfo("从 NovelProject.outlines 成功获取章节内容", {
            chapterId,
            novelChapterId: novelChapter.id,
            chapterNumber: novelChapter.chapter_number,
            contentLength: chapterContent.length,
          });
        }
      }
    }

    if (!chapterContent || chapterContent.trim().length === 0) {
      logError("章节内容为空", new Error("Empty chapter content"), {
        chapterId,
        timelineId: timelineChapter.timeline_id,
        novelChapterId: timelineChapter.chapter_id,
        chapterStatus: novelChapter.status,
        wordCount: novelChapter.word_count,
      });

      // 根据章节状态提供不同的建议
      let errorMessage = "章节内容为空，无法生成剧本";
      let suggestion = "请检查章节状态";

      if (novelChapter.status === "draft") {
        suggestion = "该章节尚未生成内容，请先在小说管理页面生成章节内容";
      } else if (novelChapter.status === "writing") {
        suggestion = "章节内容正在生成中，请稍后再试";
      } else if (novelChapter.word_count === 0) {
        suggestion = "章节字数为0，请重新生成章节内容";
      }

      return NextResponse.json(
        {
          error: errorMessage,
          suggestion,
          chapterStatus: novelChapter.status,
          chapterTitle: novelChapter.title,
          wordCount: novelChapter.word_count,
        },
        { status: 400 }
      );
    }

    logInfo("章节内容获取成功", {
      chapterId,
      contentLength: chapterContent.length,
      contentPreview: chapterContent.substring(0, 200) + "...",
      chapterNumber: timelineChapter.chapter_number,
      novelChapterId: novelChapter.id,
      novelChapterStatus: novelChapter.status,
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

    logInfo("准备调用剧本分析服务", {
      chapterId,
      chapter_number: timelineChapter.chapter_number,
      content_length: chapterContent.length,
    });

    const analyzeResult = await client.analyzeScript({
      chapter_content: chapterContent,
      chapter_number: timelineChapter.chapter_number,
    }, token);

    logInfo("剧本分析服务响应", {
      chapterId,
      success: analyzeResult.success,
      segmentCount: analyzeResult.segments?.length || 0,
      hasSegments: !!analyzeResult.segments,
      resultKeys: Object.keys(analyzeResult),
    });

    if (!analyzeResult.success || !analyzeResult.segments || analyzeResult.segments.length === 0) {
      logError("剧本分析返回空结果", new Error("Empty script analysis"), {
        chapterId,
        analyzeResult: JSON.stringify(analyzeResult).substring(0, 500),
        contentLength: chapterContent.length,
        chapterNumber: timelineChapter.chapter_number,
      });
      throw new Error("剧本分析返回空结果，请检查章节内容格式或联系管理员");
    }

    logInfo("剧本分析完成", {
      chapterId,
      segmentCount: analyzeResult.segments.length,
    });

    // 剧本片段属于这一时间线的项目章节。章节 id 由 module 写成锚点。
    const createdSegments = await createChapterScriptSegments(prisma, {
      chapterId: timelineChapter.project_chapter_id ?? chapterId,
      timelineChapterId: chapterId,
      segments: analyzeResult.segments.map((segment) => ({
        segment_order: segment.segment_order,
        content: segment.content,
        scene_description: segment.scene_description,
        character_actions: segment.character_actions,
        dialogue: segment.dialogue,
        estimated_duration: segment.estimated_duration,
        emotion_tone: segment.emotion_tone,
        source_text_start: segment.source_text_start || 0,
        source_text_end: segment.source_text_end || chapterContent.length,
      })),
    });

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
      if (error.statusCode === 401 || error.statusCode === 403) {
        return NextResponse.json({ error: "请重新登录" }, { status: 401 });
      }
      return NextResponse.json(
        {
          error: "剧本生成失败",
          detail: error.message,
        },
        { status: 502 }
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
