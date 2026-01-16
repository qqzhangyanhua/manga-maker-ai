/**
 * Canvas Chapter Generate Finals API
 * POST /api/canvas/chapter/[id]/generate-finals - 生成最终漫画图
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
        script_segments: {
          include: {
            shot_designs: {
              include: {
                scene_images: true,
              },
            },
          },
        },
      },
    });

    if (!timelineChapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (timelineChapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const allScenes = timelineChapter.script_segments.flatMap((s) =>
      s.shot_designs.flatMap((d) => d.scene_images)
    );

    if (allScenes.length === 0) {
      return NextResponse.json(
        { error: "请先生成场景图" },
        { status: 400 }
      );
    }

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { final_status: "generating" },
    });

    // TODO: 调用 novel-backend 的 comic_generator 服务
    const createdPanels = [];

    for (const scene of allScenes) {
      const comicPanel = await prisma.comicPanelResult.create({
        data: {
          shot_design_id: scene.shot_design_id,
          scene_image_id: scene.id,
          image_url: "https://placeholder.com/comic.jpg",
          generation_prompt: scene.generation_prompt,
          status: "completed",
        },
      });
      createdPanels.push(comicPanel);
    }

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        final_status: "completed",
        final_image_count: createdPanels.length,
      },
    });

    // 更新时间线统计
    await prisma.canvasTimeline.update({
      where: { id: timelineChapter.timeline_id },
      data: {
        total_images: { increment: createdPanels.length },
        completed_chapters: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true, panels: createdPanels });
  } catch (error) {
    console.error("生成最终图失败:", error);

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { final_status: "error" },
    });

    return NextResponse.json({ error: "生成最终图失败" }, { status: 500 });
  }
}
