/**
 * Canvas Timeline Detail API
 * GET /api/canvas/timeline/[id] - 获取时间线详情
 * PATCH /api/canvas/timeline/[id] - 更新时间线配置
 * DELETE /api/canvas/timeline/[id] - 删除时间线
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

  const { id } = await params;

  try {
    const timeline = await prisma.canvasTimeline.findFirst({
      where: {
        id,
        user_id: payload.userId,
      },
      include: {
        chapters: {
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
        },
      },
    });

    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, timeline });
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

    return NextResponse.json({ success: true, timeline: updated });
  } catch (error) {
    console.error("更新时间线失败:", error);
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
