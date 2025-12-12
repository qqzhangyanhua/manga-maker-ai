/**
 * Generation Task Detail API
 *
 * GET /api/generation-tasks/[id] - Get task status
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SuccessResponse, GenerationTask } from "@/types/template";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/generation-tasks/[id]
 *
 * Get generation task details and status
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
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
      include: {
        project: {
          select: {
            id: true,
            title: true
          }
        }
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
        { success: false, error: "无权访问此任务" },
        { status: 403 }
      );
    }

    const response: SuccessResponse<{ task: typeof task }> = {
      success: true,
      data: { task }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/generation-tasks/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "获取任务详情失败" },
      { status: 500 }
    );
  }
}
