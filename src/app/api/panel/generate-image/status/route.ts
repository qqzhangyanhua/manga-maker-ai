import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { getTaskStatus } from "@/lib/unified-image-generation";

// 强制动态渲染（使用 cookies）
export const dynamic = "force-dynamic";

// GET /api/panel/generate-image/status - 查询图片生成任务状态
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // Get task_id from query params
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return NextResponse.json(
        { error: "缺少 task_id 参数" },
        { status: 400 }
      );
    }

    // Get task status
    try {
      const status = await getTaskStatus(taskId);

      return NextResponse.json({
        success: true,
        task_id: taskId,
        status: status.status,
        progress: status.progress,
        image_url: status.imageUrl,
        error: status.error,
        started_at: status.startedAt,
        completed_at: status.completedAt,
      });
    } catch (error) {
      // Task not found
      if (error instanceof Error && error.message === "Task not found") {
        return NextResponse.json(
          { error: "任务不存在或已过期" },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Get task status error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
