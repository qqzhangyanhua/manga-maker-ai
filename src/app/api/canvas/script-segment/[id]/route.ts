/**
 * Script Segment Edit API
 * PATCH /api/canvas/script-segment/[id] - 更新剧本片段
 * DELETE /api/canvas/script-segment/[id] - 删除剧本片段
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
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
    const segment = await prisma.scriptSegment.findUnique({
      where: { id },
      include: {
        timeline_chapter: {
          include: { timeline: true },
        },
      },
    });

    if (!segment) {
      return NextResponse.json({ error: "剧本片段不存在" }, { status: 404 });
    }

    if (!segment.timeline_chapter || segment.timeline_chapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const body = await req.json();
    const {
      content,
      scene_description,
      character_actions,
      dialogue,
      emotion_tone,
    } = body;

    const updated = await prisma.scriptSegment.update({
      where: { id },
      data: {
        ...(content && { content }),
        ...(scene_description && { scene_description }),
        ...(character_actions && { character_actions }),
        ...(dialogue !== undefined && { dialogue }),
        ...(emotion_tone && { emotion_tone }),
      },
    });

    return NextResponse.json({ success: true, segment: updated });
  } catch (error) {
    console.error("更新剧本片段失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
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
    const segment = await prisma.scriptSegment.findUnique({
      where: { id },
      include: {
        timeline_chapter: {
          include: { timeline: true },
        },
      },
    });

    if (!segment) {
      return NextResponse.json({ error: "剧本片段不存在" }, { status: 404 });
    }

    if (!segment.timeline_chapter || segment.timeline_chapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    await prisma.scriptSegment.delete({ where: { id } });

    await prisma.timelineChapter.update({
      where: { id: segment.timeline_chapter.id },
      data: { script_segment_count: { decrement: 1 } },
    });

    return NextResponse.json({ success: true, message: "已删除" });
  } catch (error) {
    console.error("删除剧本片段失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
