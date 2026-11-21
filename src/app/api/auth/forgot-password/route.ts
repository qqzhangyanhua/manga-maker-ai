import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitResponse } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { checkAndIncrementWindowLimitDistributed } from "@/lib/rate-limit";
import { getClientIp } from "../client-ip";
import {
  normalizePasswordResetEmail,
  PASSWORD_RESET_TTL_SECONDS,
  passwordResetAttemptsKey,
  passwordResetCodeKey,
  passwordResetVoidedKey,
} from "../password-reset";

const forgotPasswordSchema = z.object({
  email: z.string().min(1),
});

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const NO_MEMORY_FALLBACK = { allowMemoryFallback: false } as const;
const EMAIL_LIMIT_MESSAGE = "请求过于频繁，请稍后再试";
const IP_LIMIT_MESSAGE = "操作过于频繁，请稍后再试";

export async function POST(req: NextRequest) {
  try {
    const parsed = forgotPasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "请提供邮箱地址" }, { status: 400 });
    }

    const { email } = parsed.data;

    const normalizedEmail = normalizePasswordResetEmail(email);
    const emailLimit = await checkAndIncrementWindowLimitDistributed(
      `forgot-password:email:${normalizedEmail}`,
      3,
      30 * 60 * 1000,
      NO_MEMORY_FALLBACK,
    );
    if (!emailLimit.allowed) {
      return rateLimitResponse(EMAIL_LIMIT_MESSAGE);
    }

    const ipLimit = await checkAndIncrementWindowLimitDistributed(
      `forgot-password:ip:${getClientIp(req)}`,
      10,
      60 * 1000,
      NO_MEMORY_FALLBACK,
    );
    if (!ipLimit.allowed) {
      return rateLimitResponse(IP_LIMIT_MESSAGE);
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    // 未注册和发信失败都返回成功，避免用状态码区分邮箱是否存在
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const code = generateCode();
    // 新验证码作废上一轮的错误计数和作废标记
    await redis.del(
      passwordResetAttemptsKey(normalizedEmail),
      passwordResetVoidedKey(normalizedEmail),
    );
    await redis.set(passwordResetCodeKey(normalizedEmail), code, "EX", PASSWORD_RESET_TTL_SECONDS);

    try {
      await sendPasswordResetEmail(normalizedEmail, code);
    } catch (mailError) {
      console.error("发送重置邮件失败:", mailError);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
