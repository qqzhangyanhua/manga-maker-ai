import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, clearAuthCookie, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE() {
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

    await prisma.user.delete({
      where: { id: payload.userId },
    });

    const response = NextResponse.json({ success: true, message: "账户已注销" });
    clearAuthCookie(response);
    return response;
  } catch (error) {
    console.error("注销账户失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
