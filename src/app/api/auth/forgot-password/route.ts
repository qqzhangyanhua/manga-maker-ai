import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { sendPasswordResetEmail } from "@/lib/mailer";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const RESET_PREFIX = "password-reset:";
const RESET_TTL = 600; // 10 minutes

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "请提供邮箱地址" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const code = generateCode();
    await redis.set(`${RESET_PREFIX}${email.toLowerCase()}`, code, "EX", RESET_TTL);

    try {
      await sendPasswordResetEmail(email, code);
    } catch (mailError) {
      console.error("发送重置邮件失败:", mailError);
      return NextResponse.json({ error: "邮件发送失败，请稍后重试" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
