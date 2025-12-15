import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/mailer";
import { hashText } from "@/lib/auth";
import { checkAndIncrementWindowLimitDistributed } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

const generateCode = () => crypto.randomInt(100000, 999999).toString();
const IP_HEADER_KEY = "x-forwarded-for";

const getClientIp = (request: NextRequest) => {
  const forwarded = request.headers.get(IP_HEADER_KEY);
  if (forwarded) {
    return forwarded.split(",")[0]?.trim();
  }
  return request.ip ?? "unknown";
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email } = parsed.data;
    const clientIp = getClientIp(request);

    // 双维度限流：同邮箱 30 分钟 3 次，同 IP 1 分钟 10 次
    const emailLimit = await checkAndIncrementWindowLimitDistributed(`email:${email}`, 3, 30 * 60 * 1000);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { success: false, message: "请求过于频繁，请稍后再试" },
        { status: 429 },
      );
    }

    const ipLimit = await checkAndIncrementWindowLimitDistributed(`ip:${clientIp}`, 10, 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { success: false, message: "操作过于频繁，请稍后再试" },
        { status: 429 },
      );
    }


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
