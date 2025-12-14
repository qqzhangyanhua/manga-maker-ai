import { NextRequest, NextResponse } from "next/server";
import { ensureDb, prisma } from "@/lib/db";
import { readAuthCookie, verifyAuthToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/profile
 * 更新用户基本信息（用户名、头像）
 */
export async function PATCH(request: NextRequest) {
  try {
    await ensureDb();

    const token = readAuthCookie(request);
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const body = await request.json();
    const { name, image } = body;

    // 构建更新数据
    const updateData: { name?: string; image?: string; updated_at: Date } = {
      updated_at: new Date(),
    };

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
      }
      if (name.length > 50) {
        return NextResponse.json({ error: "用户名最多50个字符" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (image !== undefined) {
      if (image !== null && typeof image !== "string") {
        return NextResponse.json({ error: "头像URL格式错误" }, { status: 400 });
      }
      updateData.image = image;
    }

    // 更新用户信息
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      data: { user: updatedUser },
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新用户信息失败:", error);
    return NextResponse.json(
      { error: "更新失败" },
      { status: 500 }
    );
  }
}
