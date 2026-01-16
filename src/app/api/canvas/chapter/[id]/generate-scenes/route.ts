/**
 * Canvas Chapter Generate Scenes API
 * POST /api/canvas/chapter/[id]/generate-scenes - 生成场景图
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
            shot_designs: true,
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

    const allShots = timelineChapter.script_segments.flatMap(
      (s) => s.shot_designs
    );
    if (allShots.length === 0) {
      return NextResponse.json(
        { error: "请先生成镜头设计" },
        { status: 400 }
      );
    }

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { scene_status: "generating" },
    });

    // TODO: 调用 novel-backend 的 scene_composer 服务
    const createdScenes = [];

    for (const shot of allShots) {
      const sceneImage = await prisma.sceneImage.create({
        data: {
          shot_design_id: shot.id,
          image_url: "https://placeholder.com/scene.jpg",
          generation_prompt: shot.prompt,
          status: "completed",
        },
      });
      createdScenes.push(sceneImage);
    }

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        scene_status: "completed",
        scene_image_count: createdScenes.length,
      },
    });

    return NextResponse.json({ success: true, scenes: createdScenes });
  } catch (error) {
    console.error("生成场景图失败:", error);

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { scene_status: "error" },
    });

    return NextResponse.json({ error: "生成场景图失败" }, { status: 500 });
  }
}
