/**
 * Canvas Timeline Detail API
 * GET /api/canvas/timeline/[id] - 获取时间线详情（支持分页窗口）
 * PATCH /api/canvas/timeline/[id] - 更新时间线配置
 * DELETE /api/canvas/timeline/[id] - 删除时间线
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const DEFAULT_WINDOW_RANGE = 2;
const MAX_WINDOW_RANGE = 5;

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

  const { id } = await params;

  const url = new URL(req.url);
  const centerParam = url.searchParams.get("center");
  const rangeParam = url.searchParams.get("range");

  const range = Math.min(
    parseInt(rangeParam || String(DEFAULT_WINDOW_RANGE), 10),
    MAX_WINDOW_RANGE
  );

  try {
    const timeline = await prisma.canvasTimeline.findFirst({
      where: {
        id,
        user_id: payload.userId,
      },
      include: {
        chapters: {
          orderBy: { chapter_number: "asc" },
          select: {
            id: true,
            chapter_number: true,
            script_status: true,
            shot_status: true,
            scene_status: true,
            final_status: true,
          },
        },
      },
    });

    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }

    const totalChapters = timeline.chapters.length;

    if (totalChapters === 0) {
      return NextResponse.json({
        success: true,
        timeline: {
          ...timeline,
          chapter_summaries: [],
          chapters: [],
          window: {
            center: 1,
            range,
            start: 1,
            end: 1,
            total: 0,
            hasMore: { prev: false, next: false },
          },
        },
      });
    }

    const center = centerParam
      ? Math.max(1, Math.min(parseInt(centerParam, 10), totalChapters))
      : 1;

    const windowStart = Math.max(1, center - range);
    const windowEnd = Math.min(totalChapters, center + range);

    const windowChapters = await prisma.timelineChapter.findMany({
      where: {
        timeline_id: id,
        chapter_number: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      orderBy: { chapter_number: "asc" },
    });

    const response = {
      id: timeline.id,
      novel_project_id: timeline.novel_project_id,
      user_id: timeline.user_id,
      title: timeline.title,
      status: timeline.status,
      config: timeline.config,
      total_chapters: timeline.total_chapters,
      completed_chapters: timeline.completed_chapters,
      total_shots: timeline.total_shots,
      total_images: timeline.total_images,
      created_at: timeline.created_at.toISOString(),
      updated_at: timeline.updated_at.toISOString(),
      chapter_summaries: timeline.chapters.map((ch) => ({
        id: ch.id,
        chapter_number: ch.chapter_number,
        script_status: ch.script_status,
        shot_status: ch.shot_status,
        scene_status: ch.scene_status,
        final_status: ch.final_status,
      })),
      chapters: windowChapters.map((ch) => ({
        id: ch.id,
        timeline_id: ch.timeline_id,
        chapter_number: ch.chapter_number,
        script_status: ch.script_status,
        shot_status: ch.shot_status,
        scene_status: ch.scene_status,
        final_status: ch.final_status,
        script_segment_count: ch.script_segment_count,
        shot_count: ch.shot_count,
        scene_image_count: ch.scene_image_count,
        final_image_count: ch.final_image_count,
        created_at: ch.created_at.toISOString(),
        updated_at: ch.updated_at.toISOString(),
      })),
      window: {
        center,
        range,
        start: windowStart,
        end: windowEnd,
        total: totalChapters,
        hasMore: {
          prev: windowStart > 1,
          next: windowEnd < totalChapters,
        },
      },
    };

    return NextResponse.json({ success: true, timeline: response });
  } catch (error) {
    console.error("获取时间线详情失败:", error);
    return NextResponse.json({ error: "获取时间线详情失败" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { title, config, status } = body;

    logInfo("更新时间线配置", {
      endpoint: "/api/canvas/timeline/[id]",
      timelineId: id,
      userId: payload.userId,
      hasConfig: !!config,
      hasTitle: !!title,
    });

    const timeline = await prisma.canvasTimeline.findFirst({
      where: { id, user_id: payload.userId },
    });

    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }

    const updated = await prisma.canvasTimeline.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(config && { config }),
        ...(status && { status }),
        updated_at: new Date(),
      },
    });

    logInfo("时间线配置更新成功", {
      timelineId: id,
      userId: payload.userId,
    });

    return NextResponse.json({ success: true, timeline: updated });
  } catch (error) {
    logError("更新时间线失败", error, {
      timelineId: id,
      userId: payload.userId,
    });
    return NextResponse.json({ error: "更新时间线失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const timeline = await prisma.canvasTimeline.findFirst({
      where: { id, user_id: payload.userId },
    });

    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }

    await prisma.canvasTimeline.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "时间线已删除" });
  } catch (error) {
    console.error("删除时间线失败:", error);
    return NextResponse.json({ error: "删除时间线失败" }, { status: 500 });
  }
}
