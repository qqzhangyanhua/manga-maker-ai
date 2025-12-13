import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/story/[id]/chapters
 * 获取故事的所有章节
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: storyId } = await context.params;

    // 验证故事所有权
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { user_id: true }
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 获取章节列表（按顺序排序）
    const chapters = await prisma.chapter.findMany({
      where: { story_id: storyId },
      orderBy: { chapter_order: "asc" },
      include: {
        _count: {
          select: { panels: true }
        }
      }
    });

    // 转换为前端格式
    const chaptersWithCount = chapters.map((chapter) => ({
      ...chapter,
      panelCount: chapter._count.panels
    }));

    return NextResponse.json({ chapters: chaptersWithCount });
  } catch (error) {
    console.error("获取章节列表失败:", error);
    return NextResponse.json(
      { error: "获取章节列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/story/[id]/chapters
 * 创建新章节
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: storyId } = await context.params;
    const body = await request.json();
    const { title, summary } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "章节标题不能为空" }, { status: 400 });
    }

    // 验证故事所有权
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { user_id: true }
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 获取当前最大的 chapter_order
    const lastChapter = await prisma.chapter.findFirst({
      where: { story_id: storyId },
      orderBy: { chapter_order: "desc" },
      select: { chapter_order: true }
    });

    const newChapterOrder = (lastChapter?.chapter_order ?? 0) + 1;

    // 创建章节
    const chapter = await prisma.chapter.create({
      data: {
        story_id: storyId,
        title,
        summary: summary || null,
        chapter_order: newChapterOrder
      }
    });

    return NextResponse.json({ chapter }, { status: 201 });
  } catch (error) {
    console.error("创建章节失败:", error);
    return NextResponse.json(
      { error: "创建章节失败" },
      { status: 500 }
    );
  }
}
