import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimitResponse } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { checkAndIncrementWindowLimitDistributed } from "@/lib/rate-limit";
import { getClientIp } from "../client-ip";
import {
  normalizePasswordResetEmail,
  PASSWORD_RESET_MAX_ATTEMPTS,
  PASSWORD_RESET_TTL_SECONDS,
  passwordResetAttemptsKey,
  passwordResetCodeKey,
  passwordResetCodesMatch,
  passwordResetVoidedKey,
} from "../password-reset";

const resetPasswordSchema = z.object({
  email: z.string().min(1),
  code: z.string().min(1),
  newPassword: z.string().min(1),
});

const NO_MEMORY_FALLBACK = { allowMemoryFallback: false } as const;
const IP_LIMIT_MESSAGE = "请求过于频繁，请稍后再试";
const INVALID_CODE_MESSAGE = "验证码无效或已过期";
const VOIDED_MESSAGE = "验证码已失效，请重新获取验证码";

export async function POST(req: NextRequest) {
  try {
    const parsed = resetPasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const { email, code, newPassword } = parsed.data;
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
    }

    const ipLimit = await checkAndIncrementWindowLimitDistributed(
      `reset-password:ip:${getClientIp(req)}`,
      20,
      10 * 60 * 1000,
      NO_MEMORY_FALLBACK,
    );
    if (!ipLimit.allowed) {
      return rateLimitResponse(IP_LIMIT_MESSAGE);
    }

    const normalizedEmail = normalizePasswordResetEmail(email);
    const codeKey = passwordResetCodeKey(normalizedEmail);
    const attemptsKey = passwordResetAttemptsKey(normalizedEmail);
    const voidedKey = passwordResetVoidedKey(normalizedEmail);

    // 作废标记与“验证码不存在”分开保存，第 6 次即使提交旧的正确验证码也要返回 429
    const voided = await redis.get(voidedKey);
    if (voided) {
      return rateLimitResponse(VOIDED_MESSAGE);
    }

    const storedCode = await redis.get(codeKey);
    if (!storedCode || !passwordResetCodesMatch(storedCode, code)) {
      if (storedCode) {
        const attemptsRaw = await redis.incr(attemptsKey);
        const attempts = typeof attemptsRaw === "number" ? attemptsRaw : Number(attemptsRaw);
        if (attempts === 1) {
          await redis.expire(attemptsKey, PASSWORD_RESET_TTL_SECONDS);
        }
        if (attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
          await redis.del(codeKey, attemptsKey);
          await redis.set(voidedKey, "1", "EX", PASSWORD_RESET_TTL_SECONDS);
        }
      }
      return NextResponse.json({ error: INVALID_CODE_MESSAGE }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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

    await redis.del(codeKey, attemptsKey, voidedKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("reset-password error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
