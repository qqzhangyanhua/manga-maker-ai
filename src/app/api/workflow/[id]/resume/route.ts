import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { WorkflowEngine } from "@/lib/workflow-engine";

/**
 * POST /api/workflow/[id]/resume
 * Resume a failed or interrupted workflow
 */
export async function POST(
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

        // Resume workflow
        const result = await WorkflowEngine.resume(workflowId);

        return NextResponse.json({
            success: true,
            result,
            message: "工作流已恢复并完成",
        });
    } catch (error) {
        console.error("Resume workflow error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
