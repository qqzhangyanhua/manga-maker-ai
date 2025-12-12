import { NextResponse } from "next/server";
import { getTaskStatus } from "@/lib/unified-image-generation";

/**
 * GET /api/image-generation/status?task_id=xxx
 * Get image generation task status
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return NextResponse.json(
        { error: "缺少 task_id 参数" },
        { status: 400 }
      );
    }

    const status = await getTaskStatus(taskId);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Get task status error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
