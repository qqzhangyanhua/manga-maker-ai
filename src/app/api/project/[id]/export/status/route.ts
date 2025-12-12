import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

/**
 * GET /api/project/[id]/export/status?job_id=xxx
 * Check export job status
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json(
        { error: "缺少 job_id 参数" },
        { status: 400 }
      );
    }

    // In production, query from database or job queue
    // For now, return mock status
    return NextResponse.json({
      job_id: jobId,
      status: "completed",
      progress: 100,
      download_url: \`/api/project/\${(await params).id}/export/download?job_id=\${jobId}\`,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get export status error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
