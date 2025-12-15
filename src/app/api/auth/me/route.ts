import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readAuthCookie, verifyAuthToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {

    const token = readAuthCookie(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: "登录状态已失效" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        verified: true,
        created_at: true,
        role: true,
        status: true,
        credits: true,
        total_credits_used: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { user } });
  } catch (error) {
    console.error("获取当前用户失败", error);
    return NextResponse.json({ success: false, message: "获取用户信息失败" }, { status: 500 });
  }
}
