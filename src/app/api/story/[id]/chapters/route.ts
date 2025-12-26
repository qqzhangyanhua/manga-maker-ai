import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";

/**
 * GET /api/story/[id]/chapters
 * 获取故事的所有章节
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ userId }) => {
    const { id: storyId } = await context.params;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { user_id: true }
    });

    if (!story) {
      const error = new Error("故事不存在") as any;
      error.status = 404;
      throw error;
    }

    if (story.user_id !== userId) {
      const error = new Error("无权访问此故事") as any;
      error.status = 403;
      throw error;
    }

    const chapters = await prisma.chapter.findMany({
      where: { story_id: storyId },
      orderBy: { chapter_order: "asc" },
      include: {
        _count: {
          select: { panels: true }
        }
      }
    });

    const chaptersWithCount = chapters.map((chapter) => ({
      ...chapter,
      panelCount: chapter._count.panels
    }));

    return { chapters: chaptersWithCount };
  });
}

/**
 * POST /api/story/[id]/chapters
 * 创建新章节
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ userId }) => {
    const { id: storyId } = await context.params;
    const body = await request.json();
    const { title, summary } = body;

    if (!title || typeof title !== "string") {
      const error = new Error("章节标题不能为空") as any;
      error.status = 400;
      throw error;
    }

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { user_id: true }
    });

    if (!story) {
      const error = new Error("故事不存在") as any;
      error.status = 404;
      throw error;
    }

    if (story.user_id !== userId) {
      const error = new Error("无权访问此故事") as any;
      error.status = 403;
      throw error;
    }

    const lastChapter = await prisma.chapter.findFirst({
      where: { story_id: storyId },
      orderBy: { chapter_order: "desc" },
      select: { chapter_order: true }
    });

    const newChapterOrder = (lastChapter?.chapter_order ?? 0) + 1;

    const chapter = await prisma.chapter.create({
      data: {
        story_id: storyId,
        title,
        summary: summary || null,
        chapter_order: newChapterOrder
      }
    });

    return { chapter };
  });
}
