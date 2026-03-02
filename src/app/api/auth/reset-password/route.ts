import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import bcrypt from "bcryptjs";

const RESET_PREFIX = "password-reset:";

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
    }

    const storedCode = await redis.get(`${RESET_PREFIX}${email.toLowerCase()}`);
    if (!storedCode || storedCode !== code) {
      return NextResponse.json({ error: "验证码无效或已过期" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hashedPassword },
    });

    // Delete the used code
    await redis.del(`${RESET_PREFIX}${email.toLowerCase()}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("reset-password error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
