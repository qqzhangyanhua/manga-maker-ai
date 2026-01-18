import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { Prisma, prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/workflow
 * List user's workflows
 */
export async function GET(req: Request) {
    try {
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

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const limit = parseInt(searchParams.get("limit") || "20");

        // Build query
        const where: Prisma.WorkflowWhereInput = { user_id: payload.userId };
        if (status) {
            where.status = status;
        }

        // Get workflows
        const workflows = await prisma.workflow.findMany({
            where,
            orderBy: { created_at: "desc" },
            take: limit,
        });

        return NextResponse.json({
            success: true,
            workflows,
            count: workflows.length,
        });
    } catch (error) {
        console.error("List workflows error:", error);
        const message = error instanceof Error ? error.message : "未知错误";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
