import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { NextResponse } from "next/server";
import { extractCharacterStates, batchExtractStoryStates } from "@/lib/character-state-extractor";
import { logInfo, logError } from "@/lib/api-logger";

/**
 * POST /api/chapter/[id]/extract-states
 * 提取章节的角色状态（可以在生成分镜后调用）
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    logInfo("Request received", { endpoint: "/api/chapter/[id]/extract-states", method: "POST" });

    // 1. 验证权限
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

    logInfo("User authenticated", { endpoint: "/api/chapter/[id]/extract-states", userId, chapterId });

    // 2. 检查章节所有权
    const { prisma } = await import("@/lib/db");
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

    // 3. 提取角色状态
    logInfo("Starting character state extraction", { endpoint: "/api/chapter/[id]/extract-states", userId, chapterId });

    await extractCharacterStates(chapterId, userId);

    logInfo("Character state extraction completed", {
      endpoint: "/api/chapter/[id]/extract-states",
      userId,
      chapterId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      message: "角色状态提取完成",
    });
  } catch (error) {
    logError("Character state extraction failed", error, {
      endpoint: "/api/chapter/[id]/extract-states",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "提取失败",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chapter/[id]/extract-states?batch=true
 * 批量提取整个故事的所有章节状态
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    // 验证权限
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

    // 获取章节对应的故事ID
    const { prisma } = await import("@/lib/db");
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: {
            id: true,
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

    const url = new URL(request.url);
    const isBatch = url.searchParams.get("batch") === "true";

    if (isBatch) {
      logInfo("Starting batch state extraction", {
        endpoint: "/api/chapter/[id]/extract-states",
        userId,
        storyId: chapter.story.id,
      });

      // 批量提取整个故事
      await batchExtractStoryStates(chapter.story.id, userId);

      logInfo("Batch state extraction completed", {
        endpoint: "/api/chapter/[id]/extract-states",
        userId,
        storyId: chapter.story.id,
        durationMs: Date.now() - startedAt,
      });

      return NextResponse.json({
        success: true,
        message: "批量提取完成",
      });
    } else {
      // 获取单个章节的状态
      const states = await prisma.chapterCharacterState.findMany({
        where: { chapter_id: chapterId },
        include: {
          character: {
            select: {
              id: true,
              name: true,
              reference_image: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        states,
      });
    }
  } catch (error) {
    logError("State extraction operation failed", error, {
      endpoint: "/api/chapter/[id]/extract-states",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "操作失败",
      },
      { status: 500 }
    );
  }
}
