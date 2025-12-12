/**
 * Generation Task Cancel API
 *
 * POST /api/generation-tasks/[id]/cancel - Cancel task
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SuccessResponse } from "@/types/template";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/generation-tasks/[id]/cancel
 *
 * Cancel a generation task
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = params;

    // Require authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: "无效的token" },
        { status: 401 }
      );
    }

    // Fetch task
    const task = await prisma.generationTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        user_id: true,
        status: true
      }
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "任务不存在" },
        { status: 404 }
      );
    }

    // Check ownership
    if (task.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权操作此任务" },
        { status: 403 }
      );
    }

    // Check if task can be cancelled
    if (task.status === "completed") {
      return NextResponse.json(
        { success: false, error: "任务已完成，无法取消" },
        { status: 400 }
      );
    }

    if (task.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "任务已取消" },
        { status: 400 }
      );
    }

    if (task.status === "failed") {
      return NextResponse.json(
        { success: false, error: "任务已失败" },
        { status: 400 }
      );
    }

    // Update task status to cancelled
    const updatedTask = await prisma.generationTask.update({
      where: { id: taskId },
      data: {
        status: "cancelled",
        completed_at: new Date()
      }
    });

    // TODO: Signal background worker to stop processing this task
    // In production, this should:
    // 1. Set a cancellation flag in Redis/database
    // 2. Worker checks flag before processing each panel
    // 3. Worker stops gracefully when flag is detected

    const response: SuccessResponse<{ task: typeof updatedTask }> = {
      success: true,
      data: { task: updatedTask },
      message: "任务已取消"
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/generation-tasks/[id]/cancel error:", error);
    return NextResponse.json(
      { success: false, error: "取消任务失败" },
      { status: 500 }
    );
  }
}
