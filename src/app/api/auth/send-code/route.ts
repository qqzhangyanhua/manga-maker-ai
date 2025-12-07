import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDb, prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/mailer";
import { hashText } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

const generateCode = () => crypto.randomInt(100000, 999999).toString();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email } = parsed.data;

    await ensureDb();

    const existingUser = await prisma.user.findFirst({
      where: { email, verified: true },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json({ success: false, message: "该邮箱已注册，请直接登录" }, { status: 400 });
    }

    const code = generateCode();
    const codeHash = await hashText(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 分钟

    await prisma.$transaction(async (tx) => {
      await tx.emailVerification.deleteMany({ where: { email } });
      await tx.emailVerification.create({
        data: {
          email,
          code_hash: codeHash,
          expires_at: expiresAt,
          used: false,
          created_at: new Date(),
        },
      });
    });

    await sendVerificationEmail(email, code);

    return NextResponse.json({ success: true, message: "验证码已发送，请在 10 分钟内完成验证" });
  } catch (error) {
    console.error("发送验证码失败", error);
    return NextResponse.json({ success: false, message: "发送验证码失败，请稍后再试" }, { status: 500 });
  }
}
