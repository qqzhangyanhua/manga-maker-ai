/**
 * Canvas Timeline Chapters API
 * GET /api/canvas/timeline/[id]/chapters - 获取时间线的所有章节
 * POST /api/canvas/timeline/[id]/chapters - 添加章节到时间线
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id: timelineId } = await params;

  try {
    const timeline = await prisma.canvasTimeline.findFirst({
      where: { id: timelineId, user_id: payload.userId },
    });

    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }

    const chapters = await prisma.timelineChapter.findMany({
      where: { timeline_id: timelineId },
      orderBy: { chapter_number: "asc" },
      include: {
        script_segments: {
          orderBy: { segment_order: "asc" },
          include: {
            shot_designs: {
              orderBy: { shot_order: "asc" },
              include: {
                scene_images: true,
                comic_panels: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, chapters });
  } catch (error) {
    console.error("获取章节列表失败:", error);
    return NextResponse.json({ error: "获取章节列表失败" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id: timelineId } = await params;

  try {
    const body = await req.json();
    const { novel_project_id, chapter_number } = body;

    if (!novel_project_id || chapter_number === undefined) {
      return NextResponse.json(
        { error: "缺少必填字段: novel_project_id, chapter_number" },
        { status: 400 }
      );
    }

    const timeline = await prisma.canvasTimeline.findFirst({
      where: { id: timelineId, user_id: payload.userId },
    });

    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }

    // 验证 novel_project_id 匹配时间线
    if (timeline.novel_project_id !== novel_project_id) {
      return NextResponse.json(
        {
          error: "项目不匹配",
          suggestion: "该章节不属于当前时间线的小说项目",
        },
        { status: 400 }
      );
    }

    // 查找对应的 NovelChapter 记录（通过 project_id + chapter_number）
    let novelChapter = await prisma.novelChapter.findFirst({
      where: {
        project_id: novel_project_id,
        chapter_number: chapter_number,
      },
      select: {
        id: true,
        status: true,
        content: true,
        word_count: true,
        title: true,
        chapter_number: true,
        project_id: true,
      },
    });

    // 如果不存在 NovelChapter 记录，从 NovelProject.outlines 创建
    if (!novelChapter) {
      const project = await prisma.novelProject.findUnique({
        where: { id: novel_project_id },
        select: { outlines: true },
      });

      if (!project?.outlines) {
        return NextResponse.json(
          {
            error: "项目大纲不存在",
            suggestion: "请先在小说管理页面生成章节大纲",
          },
          { status: 404 }
        );
      }

      const outlines = project.outlines as Array<{
        chapterNumber?: number;
        chapter_number?: number;
        title?: string;
        outline?: string;
        content?: string;
      }>;

      const matchedOutline = outlines.find(
        (o) =>
          (o.chapterNumber === chapter_number || o.chapter_number === chapter_number)
      );

      if (!matchedOutline) {
        return NextResponse.json(
          {
            error: "章节不存在",
            suggestion: `未找到第${chapter_number}章的大纲信息`,
          },
          { status: 404 }
        );
      }

      // 创建 NovelChapter 记录
      novelChapter = await prisma.novelChapter.create({
        data: {
          project_id: novel_project_id,
          chapter_number: chapter_number,
          title: matchedOutline.title || `第${chapter_number}章`,
          outline: matchedOutline.outline,
          content: matchedOutline.content,
          word_count: matchedOutline.content?.length || 0,
          status: matchedOutline.content ? "completed" : "draft",
        },
      });
    }

    // 检查章节内容（优先检查 content，fallback 到 outlines）
    let hasContent = novelChapter.content && novelChapter.content.trim().length > 0;

    if (!hasContent) {
      // Fallback: 检查 NovelProject.outlines
      const project = await prisma.novelProject.findUnique({
        where: { id: novel_project_id },
        select: { outlines: true },
      });

      if (project?.outlines) {
        const outlines = project.outlines as Array<{
          chapterNumber?: number;
          chapter_number?: number;
          content?: string;
        }>;

        const matchedOutline = outlines.find(
          (o) =>
            (o.chapterNumber === chapter_number || o.chapter_number === chapter_number)
        );

        hasContent = !!(matchedOutline?.content && matchedOutline.content.trim().length > 0);
      }
    }

    if (!hasContent) {
      return NextResponse.json(
        {
          error: "章节内容为空",
          suggestion: "该章节没有内容，请先在小说管理页面生成章节内容",
          chapterTitle: novelChapter.title,
          wordCount: novelChapter.word_count,
        },
        { status: 400 }
      );
    }

    const chapter = await prisma.timelineChapter.create({
      data: {
        timeline_id: timelineId,
        chapter_id: novelChapter.id,
        chapter_number: chapter_number,
      },
    });

    // 更新时间线的章节计数
    await prisma.canvasTimeline.update({
      where: { id: timelineId },
      data: {
        total_chapters: { increment: 1 },
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, chapter });
  } catch (error) {
    console.error("添加章节失败:", error);
    return NextResponse.json({ error: "添加章节失败" }, { status: 500 });
  }
}
