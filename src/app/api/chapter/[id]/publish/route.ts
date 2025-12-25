import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import { extractCharacterStates } from "@/lib/character-state-extractor";

/**
 * POST /api/chapter/[id]/publish
 * 发布章节（连载模式）
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    logInfo("Request received", { endpoint: "/api/chapter/[id]/publish", method: "POST" });

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

    logInfo("User authenticated", {
      endpoint: "/api/chapter/[id]/publish",
      userId,
      chapterId,
    });

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: {
            user_id: true,
            is_serialized: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    if (chapter.publish_status === "published") {
      return NextResponse.json(
        { error: "章节已发布", chapter },
        { status: 409 }
      );
    }

    if (chapter.story.is_serialized) {
      const publishedCount = await prisma.chapter.count({
        where: {
          story_id: chapter.story_id,
          publish_status: "published",
        },
      });

      if (chapter.chapter_order !== publishedCount + 1) {
        return NextResponse.json(
          {
            error: `不能跳章发布。当前已发布 ${publishedCount} 章，应发布第 ${publishedCount + 1} 章`,
            currentChapterOrder: chapter.chapter_order,
            expectedOrder: publishedCount + 1,
          },
          { status: 400 }
        );
      }
    }

    logInfo("Publishing chapter", {
      endpoint: "/api/chapter/[id]/publish",
      userId,
      chapterId,
      chapter_order: chapter.chapter_order,
    });

    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        publish_status: "published",
        published_at: new Date(),
        updated_at: new Date(),
      },
    });

    const panelsCount = await prisma.panel.count({
      where: { chapter_id: chapterId },
    });

    if (panelsCount > 0) {
      extractCharacterStates(chapterId, userId).catch((error) => {
        console.error("Failed to extract character states:", error);
      });

      logInfo("Character state extraction triggered", {
        endpoint: "/api/chapter/[id]/publish",
        userId,
        chapterId,
      });
    }

    logInfo("Chapter published", {
      endpoint: "/api/chapter/[id]/publish",
      userId,
      chapterId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      chapter: updatedChapter,
      message: `章节已发布：${chapter.title}`,
    });
  } catch (error) {
    logError("Chapter publish failed", error, {
      endpoint: "/api/chapter/[id]/publish",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "发布章节失败",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chapter/[id]/publish
 * 取消发布章节
 */
export async function DELETE(
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

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        publish_status: "draft",
        published_at: null,
        updated_at: new Date(),
      },
    });

    logInfo("Chapter unpublished", {
      endpoint: "/api/chapter/[id]/publish",
      userId,
      chapterId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      chapter: updatedChapter,
      message: "已取消发布",
    });
  } catch (error) {
    logError("Chapter unpublish failed", error, {
      endpoint: "/api/chapter/[id]/publish",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "取消发布失败",
      },
      { status: 500 }
    );
  }
}
