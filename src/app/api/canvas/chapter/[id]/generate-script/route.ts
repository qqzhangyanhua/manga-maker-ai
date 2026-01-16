/**
 * Canvas Chapter Generation API
 * POST /api/canvas/chapter/[id]/generate-script - 生成剧本
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
    // 获取章节信息
    const timelineChapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      include: {
        timeline: true,
      },
    });

    if (!timelineChapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (timelineChapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    // 更新状态为生成中
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { script_status: "generating" },
    });

    // TODO: 调用 novel-backend 的 script_analyzer 服务
    // 这里先返回模拟数据，后续集成实际服务
    const mockScriptSegments = [
      {
        segment_order: 1,
        content: "剧本片段1",
        scene_description: "场景描述1",
        character_actions: "角色动作1",
        dialogue: "对白1",
        estimated_duration: 30,
        emotion_tone: "紧张",
        source_text_start: 0,
        source_text_end: 100,
      },
    ];

    // 创建剧本片段
    const createdSegments = await Promise.all(
      mockScriptSegments.map((segment) =>
        prisma.scriptSegment.create({
          data: {
            timeline_chapter_id: chapterId,
            ...segment,
          },
        })
      )
    );

    // 更新状态为完成
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        script_status: "completed",
        script_segment_count: createdSegments.length,
      },
    });

    return NextResponse.json({
      success: true,
      segments: createdSegments,
    });
  } catch (error) {
    console.error("生成剧本失败:", error);

    // 更新状态为错误
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { script_status: "error" },
    });

    return NextResponse.json({ error: "生成剧本失败" }, { status: 500 });
  }
}
