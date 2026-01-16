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
    const { chapter_id, chapter_number } = body;

    if (!chapter_id || chapter_number === undefined) {
      return NextResponse.json(
        { error: "缺少必填字段: chapter_id, chapter_number" },
        { status: 400 }
      );
    }

    const timeline = await prisma.canvasTimeline.findFirst({
      where: { id: timelineId, user_id: payload.userId },
    });

    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }

    const chapter = await prisma.timelineChapter.create({
      data: {
        timeline_id: timelineId,
        chapter_id,
        chapter_number,
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
