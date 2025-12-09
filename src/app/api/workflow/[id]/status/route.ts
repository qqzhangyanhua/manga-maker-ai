import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { getWorkflowStatus } from "@/lib/workflow-engine";

/**
 * GET /api/workflow/[id]/status
 * Get workflow status and progress
 */
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id: workflowId } = params;

        // Verify authentication
        const cookieStore = await cookies();
        const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json({ error: "未登录" }, { status: 401 });
        }

        const payload = verifyAuthToken(token);
        if (!payload?.userId) {
            return NextResponse.json({ error: "无效的token" }, { status: 401 });
        }

        // Get workflow status
        const status = await getWorkflowStatus(workflowId);

        return NextResponse.json({
            success: true,
            workflow: status,
        });
    } catch (error) {
        console.error("Get workflow status error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
