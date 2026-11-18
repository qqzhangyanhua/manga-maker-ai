import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { assertChapterInProject } from "@/lib/project";
import { generatePanelsFromChapter } from "@/lib/panel-generator";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

/**
 * POST /api/chapter/[id]/generate-panels
 * AI为章节生成分镜脚本
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
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

    const { id: chapterId } = await context.params;
    const body = await request.json();
    const { project_id, panel_count, overwrite = false } = body;

    if (!project_id || typeof project_id !== "string") {
      return NextResponse.json(
        { error: "缺少必需的 project_id 参数" },
        { status: 400 }
      );
    }

    // 获取章节及其关联的故事
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: {
            user_id: true,
            title: true,
            genre: true
          }
        }
      }
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    // 验证所有权
    if (chapter.story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    // 验证项目所有权
    const project = await prisma.project.findUnique({
      where: { id: project_id },
      select: { user_id: true, story_id: true }
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    // 验证项目是否关联到同一个故事
    if (project.story_id !== chapter.story_id) {
      return NextResponse.json(
        { error: "项目和章节不属于同一个故事" },
        { status: 400 }
      );
    }

    // 章节必须属于该项目，避免把分镜/图片挂到别的项目的章节上
    await assertChapterInProject(prisma, chapterId, project_id);

    // 检查章节是否有梗概
    if (!chapter.summary) {
      return NextResponse.json(
        { error: "章节缺少梗概（summary），无法生成分镜" },
        { status: 400 }
      );
    }

    // 检查配额
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

    // 生成分镜
    const generatedPanels = await generatePanelsFromChapter({
      chapterTitle: chapter.title,
      chapterSummary: chapter.summary,
      storyTitle: chapter.story.title,
      genre: chapter.story.genre,
      panelCount: panel_count
    }, userId);

    // 如果需要覆盖，先删除旧分镜
    if (overwrite) {
      await prisma.panel.deleteMany({
        where: {
          project_id,
          chapter_id: chapterId
        }
      });
    }

    // 扩写模式：获取当前章节已有分镜的最大 panel_order
    let panelOrderOffset = 0;
    if (!overwrite) {
      const existingPanels = await prisma.panel.findMany({
        where: {
          project_id,
          chapter_id: chapterId,
        },
        select: { panel_order: true },
        orderBy: { panel_order: "desc" },
        take: 1,
      });

      if (existingPanels.length > 0) {
        panelOrderOffset = existingPanels[0].panel_order;
      }
    }

    // 批量创建分镜
    const panels = await prisma.$transaction(
      generatedPanels.map((panel) =>
        prisma.panel.create({
          data: {
            project_id,
            chapter_id: chapterId,
            panel_order: panel.panel_order + panelOrderOffset,
            description: panel.description,
            visual_prompt: panel.visual_prompt,
            dialogue: panel.dialogue || null,
            panel_type: panel.panel_type,
            importance: panel.importance,
            camera_angle: panel.camera_angle || null,
            shot_size: panel.shot_size || null,
            camera_movement: panel.camera_movement || null,
            movement_speed: panel.movement_speed || null,
            movement_direction: panel.movement_direction || null
          }
        })
      )
    );

    // 记录生成日志
    await recordGenerationLog({
      userId,
      projectId: project_id,
      action: "panel_generation",
      providerType: "script_analyzer",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: {
        chapter_id: chapterId,
        project_id,
        panel_count,
        overwrite
      },
      responsePayload: {
        panels_generated: panels.length,
        panel_ids: panels.map((p) => p.id)
      }
    });

    return NextResponse.json({
      success: true,
      panels,
      message: `成功为章节"${chapter.title}"生成 ${panels.length} 个分镜`
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("分镜生成失败:", error);
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
