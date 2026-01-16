/**
 * Canvas Chapter Generate Shots API
 * POST /api/canvas/chapter/[id]/generate-shots - 生成镜头设计
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
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

  const { id: chapterId } = await params;

  try {
    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      include: {
        timeline: true,
        script_segments: { orderBy: { segment_order: "asc" } },
      },
    });

    if (!timelineChapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (timelineChapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    if (timelineChapter.script_segments.length === 0) {
      return NextResponse.json(
        { error: "请先生成剧本" },
        { status: 400 }
      );
    }

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { shot_status: "generating" },
    });

    // TODO: 调用 novel-backend 的 shot_planner 服务
    let totalShots = 0;
    const allShots = [];

    for (const segment of timelineChapter.script_segments) {
      const mockShots = [
        {
          shot_order: 1,
          camera_angle: "平视",
          shot_size: "中景",
          panel_type: "dialogue",
          shot_description: `镜头描述 - ${segment.segment_order}`,
          composition_hint: "三分法构图",
          prompt: "comic panel, dialogue scene",
          negative_prompt: "blurry, low quality",
        },
      ];

      const createdShots = await Promise.all(
        mockShots.map((shot) =>
          prisma.shotDesign.create({
            data: {
              script_segment_id: segment.id,
              ...shot,
            },
          })
        )
      );

      allShots.push(...createdShots);
      totalShots += createdShots.length;
    }

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        shot_status: "completed",
        shot_count: totalShots,
      },
    });

    // 更新时间线统计
    await prisma.canvasTimeline.update({
      where: { id: timelineChapter.timeline_id },
      data: {
        total_shots: { increment: totalShots },
      },
    });

    return NextResponse.json({ success: true, shots: allShots });
  } catch (error) {
    console.error("生成镜头失败:", error);

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { shot_status: "error" },
    });

    return NextResponse.json({ error: "生成镜头失败" }, { status: 500 });
  }
}
