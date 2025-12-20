import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/chapter/[id]/character-states
 * Get character states for a chapter
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { id: chapterId } = await context.params;

    // Get chapter with story to verify ownership
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: { user_id: true },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    // Verify ownership
    if (chapter.story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    // Fetch character states
    const states = await prisma.chapterCharacterState.findMany({
      where: { chapter_id: chapterId },
      include: {
        character: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      states,
    });
  } catch (error) {
    console.error("Failed to fetch character states:", error);
    return NextResponse.json(
      { error: "获取角色状态失败" },
      { status: 500 }
    );
  }
}
