import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDb, prisma } from "@/lib/db";
import { attachAuthCookie, hashText, signAuthToken, verifyHash } from "@/lib/auth";
import { DEFAULT_REGISTER_CREDITS } from "@/lib/credits";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("请输入有效的邮箱"),
  password: z
    .string()
    .min(8, "密码至少 8 位，建议包含字母数字组合")
    .max(64, "密码过长"),
  code: z.string().length(6, "验证码格式不正确"),
  name: z.string().min(2, "昵称至少 2 个字符").max(32, "昵称过长").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email, password, code, name } = parsed.data;

    await ensureDb();

    const passwordHash = await hashText(password);
    const now = new Date();

    const user = await prisma.$transaction(async (tx) => {
      const verification = await tx.emailVerification.findFirst({
        where: { email },
        orderBy: { created_at: "desc" },
      });

      if (!verification) {
        const error = new Error("请先获取验证码");
        // @ts-expect-error 自定义标记
        error.status = 400;
        throw error;
      }

      if (verification.used) {
        const error = new Error("验证码已失效，请重新获取");
        // @ts-expect-error 自定义标记
        error.status = 400;
        throw error;
      }

      if (new Date(verification.expires_at).getTime() < Date.now()) {
        const error = new Error("验证码已过期，请重新获取");
        // @ts-expect-error 自定义标记
        error.status = 400;
        throw error;
      }

      const isCodeValid = await verifyHash(code, verification.code_hash);
      if (!isCodeValid) {
        const error = new Error("验证码不正确");
        // @ts-expect-error 自定义标记
        error.status = 400;
        throw error;
      }

      const existingUser = await tx.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          verified: true,
          role: true,
          status: true,
        },
      });

      let savedUser;

      if (existingUser) {
        if (existingUser.verified) {
          const error = new Error("该邮箱已注册，请直接登录");
          // @ts-expect-error 自定义标记
          error.status = 400;
          throw error;
        }

        savedUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            password_hash: passwordHash,
            name: name ?? existingUser.name ?? null,
            verified: true,
            email_verified_at: now,
            updated_at: now,
            role: "user",
            status: "active",
          },
          select: {
            id: true,
            email: true,
            name: true,
            verified: true,
            role: true,
            status: true,
          },
        });
      } else {
        savedUser = await tx.user.create({
          data: {
            email,
            password_hash: passwordHash,
            name: name ?? null,
            verified: true,
            email_verified_at: now,
            role: "user",
            status: "active",
            created_at: now,
            updated_at: now,
            credits: DEFAULT_REGISTER_CREDITS,
            total_credits_used: 0,
          },
          select: {
            id: true,
            email: true,
            name: true,
            verified: true,
            role: true,
            status: true,
            credits: true,
          },
        });

        // 记录注册赠送算力交易
        await tx.creditTransaction.create({
          data: {
            user_id: savedUser.id,
            amount: DEFAULT_REGISTER_CREDITS,
            balance: DEFAULT_REGISTER_CREDITS,
            action: "register",
            description: `注册赠送 ${DEFAULT_REGISTER_CREDITS} 算力`,
          },
        });
      }

      await tx.emailVerification.update({
        where: { id: verification.id },
        data: { used: true },
      });

      return savedUser;
    });

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    });

    const response = NextResponse.json({ success: true, data: { user }, message: "注册成功，已自动登录" });
    attachAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error("注册失败", error);
    const status = (error as any)?.status ?? 500;
    const message = error instanceof Error ? error.message : "注册失败，请稍后再试";
    return NextResponse.json({ success: false, message }, { status });
  }
}
