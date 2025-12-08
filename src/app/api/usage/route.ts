import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { getUsageSummary } from "@/lib/usage";

// GET /api/usage - 获取当前用户的当日配额使用情况
export async function GET() {
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

    const summary = await getUsageSummary(payload.userId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("获取用量失败:", error);
    const message = error instanceof Error ? error.message : "获取用量失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
