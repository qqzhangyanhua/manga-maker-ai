/**
 * Canvas Generation Cancel API
 * POST /api/canvas/chapter/[id]/cancel - 取消正在进行的生成任务
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
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
    logInfo("开始取消生成任务", {
      endpoint: "/api/canvas/chapter/[id]/cancel",
      chapterId,
      userId: payload.userId,
    });

    // 获取章节并验证权限
    const chapter = await prisma.timelineChapter.findFirst({
      where: { id: chapterId },
      include: {
        timeline: {
          select: { user_id: true },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作此章节" }, { status: 403 });
    }

    // 找出正在生成的阶段
    const generatingStages: string[] = [];
    if (chapter.script_status === "generating") generatingStages.push("script");
    if (chapter.shot_status === "generating") generatingStages.push("shot");
    if (chapter.final_status === "generating") generatingStages.push("final");

    if (generatingStages.length === 0) {
      return NextResponse.json(
        { error: "没有正在进行的生成任务" },
        { status: 400 }
      );
    }

    // 将所有 generating 状态改为 pending（取消后可以重新开始）
    const updateData: Record<string, string> = {};
    generatingStages.forEach((stage) => {
      updateData[`${stage}_status`] = "pending";
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: updateData,
    });

    logInfo("生成任务已取消", {
      chapterId,
      cancelledStages: generatingStages,
    });

    return NextResponse.json({
      success: true,
      message: "生成任务已取消",
      cancelledStages: generatingStages,
    });
  } catch (error) {
    logError("取消生成任务失败", error, {
      chapterId,
      userId: payload.userId,
    });
    return NextResponse.json({ error: "取消生成任务失败" }, { status: 500 });
  }
}
