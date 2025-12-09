import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { getImageGenerationQueue } from "@/lib/unified-image-generation";

/**
 * GET /api/image/task/[id]
 * Get image generation task status
 */
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id: taskId } = params;

        // Verify authentication (optional for task status)
        const cookieStore = await cookies();
        const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json({ error: "未登录" }, { status: 401 });
        }

        const payload = verifyAuthToken(token);
        if (!payload?.userId) {
            return NextResponse.json({ error: "无效的token" }, { status: 401 });
        }

        // Get task status from queue
        const queue = getImageGenerationQueue();
        const status = queue.getStatus(taskId);

        if (!status) {
            return NextResponse.json({ error: "任务不存在" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            task: status,
        });
    } catch (error) {
        console.error("Get task status error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
