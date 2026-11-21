import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePanelsFromChapter } from "@/lib/panel-generator";
import { panels as writeChapterPanels } from "@/lib/project/chapter-panels";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { logInfo, logError } from "@/lib/api-logger";
import type { ImportTextRequest } from "./types";

/**
 * POST /api/story/[id]/import-text
 * 导入小说文本并自动生成分镜
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    logInfo("Request received", { endpoint: "/api/story/[id]/import-text", method: "POST" });

    // 1. 身份验证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }
    userId = payload.userId;
    logInfo("User authenticated", { endpoint: "/api/story/[id]/import-text", userId });

    // 2. 解析参数
    const { id: storyId } = await context.params;
    const body: ImportTextRequest = await request.json();
    const { text, chapterTitle, projectId, panelCount } = body;

    // 3. 参数验证
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "文本内容不能为空" },
        { status: 400 }
      );
    }

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "缺少必需的 projectId 参数" },
        { status: 400 }
      );
    }

    // 限制文本长度（防止超出 LLM token 限制）
    const MAX_TEXT_LENGTH = 10000;
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error: `文本过长，请限制在 ${MAX_TEXT_LENGTH} 字以内`,
          maxLength: MAX_TEXT_LENGTH,
          currentLength: text.length
        },
        { status: 400 }
      );
    }

    logInfo("Request validated", {
      endpoint: "/api/story/[id]/import-text",
      userId,
      storyId,
      projectId,
      textLength: text.length
    });

    // 4. 验证 Story 所有权
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        user_id: true,
        title: true,
        genre: true,
        style_reference_image: true,
        comic_style: {
          select: {
            prompt_prefix: true
          }
        }
      }
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 5. 验证 Project 所有权
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { user_id: true, story_id: true }
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    if (project.story_id !== storyId) {
      return NextResponse.json(
        { error: "项目和故事不匹配" },
        { status: 400 }
      );
    }

    // 6. 检查配额
    try {
      await assertAndIncrementUsage({
        userId,
        action: "panel_generation",
        providerType: "script_analyzer"
      });
    } catch (quotaError: unknown) {
      const error = quotaError as { code?: string; message?: string; limit?: number; count?: number };
      if (error?.code === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          {
            error: error.message,
            code: "QUOTA_EXCEEDED",
            limit: error.limit,
            used: error.count
          },
          { status: 429 }
        );
      }
      throw quotaError;
    }

    // 7. 创建临时 Chapter 记录
    logInfo("Creating temporary chapter", {
      endpoint: "/api/story/[id]/import-text",
      userId,
      storyId
    });

    // 获取当前故事的最大章节序号
    const lastChapter = await prisma.chapter.findFirst({
      where: { story_id: storyId },
      orderBy: { chapter_order: "desc" },
      select: { chapter_order: true }
    });

    const nextChapterOrder = (lastChapter?.chapter_order || 0) + 1;
    const finalChapterTitle = chapterTitle || `导入的内容 ${nextChapterOrder}`;

    const chapter = await prisma.chapter.create({
      data: {
        story_id: storyId,
        // 分镜写入 projectId 对应的项目，章节也必须归属同一项目（panel.project_id == chapter.project_id）
        project_id: projectId,
        title: finalChapterTitle,
        summary: text,
        chapter_order: nextChapterOrder,
        publish_status: "draft"
      }
    });

    logInfo("Temporary chapter created", {
      endpoint: "/api/story/[id]/import-text",
      userId,
      chapterId: chapter.id
    });

    // 8. 生成分镜
    logInfo("Starting panel generation", {
      endpoint: "/api/story/[id]/import-text",
      userId,
      chapterId: chapter.id
    });

    const generatedPanels = await generatePanelsFromChapter(
      {
        chapterTitle: chapter.title,
        chapterSummary: text,
        storyTitle: story.title,
        genre: story.genre,
        panelCount: panelCount,
        styleConfig: {
          style_reference_image: story.style_reference_image,
          comic_style_prompt: story.comic_style?.prompt_prefix || null
        },
        chapterId: chapter.id
      },
      userId
    );

    logInfo("Panels generated", {
      endpoint: "/api/story/[id]/import-text",
      userId,
      chapterId: chapter.id,
      panelsCount: generatedPanels.length
    });

    // 9. 批量创建分镜记录
    const createdPanels = await writeChapterPanels(projectId).add(
      [...generatedPanels]
        .sort((left, right) => left.panel_order - right.panel_order)
        .map((panel) => ({
          panelType: panel.panel_type,
          importance: panel.importance,
          description: panel.description,
          visualPrompt: panel.visual_prompt,
          dialogue: panel.dialogue || null,
          cameraAngle: panel.camera_angle || null,
          shotSize: panel.shot_size || null,
          cameraMovement: panel.camera_movement || null,
          movementSpeed: panel.movement_speed || null,
          movementDirection: panel.movement_direction || null,
        })),
      { chapter: chapter.id },
    );
    const panels = await prisma.panel.findMany({
      where: { id: { in: createdPanels.map((panel) => panel.id) } },
      orderBy: { panel_order: "asc" },
    });

    // 10. 记录生成日志
    await recordGenerationLog({
      userId,
      projectId: projectId,
      action: "panel_generation",
      providerType: "script_analyzer",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: {
        story_id: storyId,
        chapter_id: chapter.id,
        project_id: projectId,
        text_length: text.length,
        panel_count: panelCount
      },
      responsePayload: {
        panels_generated: panels.length,
        panel_ids: panels.map((p) => p.id)
      }
    });

    logInfo("Import completed", {
      endpoint: "/api/story/[id]/import-text",
      userId,
      chapterId: chapter.id,
      panelsCount: panels.length,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json({
      success: true,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      panels,
      message: `成功导入文本并生成 ${panels.length} 个分镜`
    });

  } catch (error) {
    logError("Import failed", error, {
      endpoint: "/api/story/[id]/import-text",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt
    });

    const message = error instanceof Error ? error.message : "未知错误";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "panel_generation",
        providerType: "script_analyzer",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
