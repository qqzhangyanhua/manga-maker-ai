import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateChapters } from "@/lib/chapter-generator";
import { assertAndIncrementUsage } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";
import { ensureStoryProject } from "@/lib/project";

/**
 * POST /api/story/[id]/generate-chapters
 * AI生成故事章节结构
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

    const { id: storyId } = await context.params;
    const body = await request.json();
    const { chapterCount, overwrite = false } = body;

    // 验证故事所有权
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        user_id: true,
        title: true,
        premise: true,
        genre: true,
        outline: true
      }
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 检查是否已有章节
    if (!overwrite) {
      const existingChapters = await prisma.chapter.count({
        where: { story_id: storyId }
      });

      if (existingChapters > 0) {
        return NextResponse.json(
          {
            error: "该故事已有章节，请设置 overwrite=true 覆盖",
            existingCount: existingChapters
          },
          { status: 400 }
        );
      }
    }

    // 检查配额
    try {
      await assertAndIncrementUsage({
        userId,
        action: "chapter_generation",
        providerType: "chapter_generator"
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

    // 生成章节
    const generatedChapters = await generateChapters({
      storyTitle: story.title,
      premise: story.premise,
      genre: story.genre,
      outline: story.outline as Record<string, unknown>,
      chapterCount
    });

    // 如果需要覆盖，先删除旧章节
    if (overwrite) {
      await prisma.chapter.deleteMany({
        where: { story_id: storyId }
      });
    }

    // 批量创建章节（挂在故事主项目上）
    const project = await ensureStoryProject(prisma, storyId);
    const chapters = await prisma.$transaction(
      generatedChapters.map((chapter) =>
        prisma.chapter.create({
          data: {
            story_id: storyId,
            project_id: project.id,
            title: chapter.title,
            summary: chapter.summary,
            chapter_order: chapter.chapter_order,
            is_key_chapter: chapter.is_key_chapter || false,
            key_chapter_reason: chapter.key_chapter_reason || null
          }
        })
      )
    );

    // 记录生成日志
    await recordGenerationLog({
      userId,
      action: "chapter_generation",
      providerType: "chapter_generator",
      status: "success",
      durationMs: Date.now() - startedAt,
      requestPayload: {
        story_id: storyId,
        chapter_count: chapterCount,
        overwrite
      },
      responsePayload: {
        chapters_generated: chapters.length,
        chapter_ids: chapters.map((c) => c.id)
      }
    });

    return NextResponse.json({
      success: true,
      chapters,
      message: `成功生成 ${chapters.length} 个章节`
    });
  } catch (error) {
    console.error("章节生成失败:", error);
    const message = error instanceof Error ? error.message : "未知错误";

    if (userId) {
      await recordGenerationLog({
        userId,
        action: "chapter_generation",
        providerType: "chapter_generator",
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorMessage: message
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
