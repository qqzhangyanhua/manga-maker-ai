/**
 * Get JWT Token API
 * 用于 Swagger UI 测试 - 返回当前用户的 JWT token
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: "未登录，请先访问 /api/auth/login 登录" },
        { status: 401 }
      );
    }

    // 验证 token 有效性
    try {
      const payload = verifyAuthToken(token);

      return NextResponse.json({
        token,
        user: {
          id: payload.userId,
          email: payload.email,
          role: payload.role
        },
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        message: "✅ Token 有效，可用于 Swagger UI 测试"
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Token 无效或已过期，请重新登录" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("获取 token 失败:", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}
