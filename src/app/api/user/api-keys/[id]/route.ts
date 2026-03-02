import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
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
      return NextResponse.json({ error: "无效的 token" }, { status: 401 });
    }

    const { id } = await params;

    const deleted = await prisma.userApiKey.deleteMany({
      where: {
        id,
        user_id: payload.userId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "API Key 不存在或无权限" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/user/api-keys/[id] error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
