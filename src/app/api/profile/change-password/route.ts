import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readAuthCookie, verifyAuthToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/profile/change-password
 * 修改密码
 */
export async function POST(request: NextRequest) {
  try {

    const token = readAuthCookie(request);
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    // 验证输入
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "请提供旧密码和新密码" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "新密码至少需要6个字符" },
        { status: 400 }
      );
    }

    if (newPassword.length > 100) {
      return NextResponse.json(
        { error: "新密码最多100个字符" },
        { status: 400 }
      );
    }

    // 获取用户当前密码
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, password_hash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 验证旧密码
    const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash || "");
    if (!isValidPassword) {
      return NextResponse.json({ error: "旧密码错误" }, { status: 400 });
    }

    // 生成新密码哈希
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        password_hash: newPasswordHash,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "密码修改成功",
    });
  } catch (error) {
    console.error("修改密码失败:", error);
    return NextResponse.json(
      { error: "修改密码失败" },
      { status: 500 }
    );
  }
}
