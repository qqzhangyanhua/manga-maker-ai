import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, initializeAdmin } from "@/lib/db";
import { attachAuthCookie, signAuthToken, verifyHash } from "@/lib/auth";
import { checkAndIncrementWindowLimitDistributed } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("请输入有效的邮箱"),
  password: z.string().min(8, "密码格式不正确"),
});

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
    // Initialize admin on first login if INITIAL_ADMIN_EMAIL is set
    await initializeAdmin();

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const clientIp = getClientIp(request);

    // 登录限流：同邮箱 10 分钟 5 次，同 IP 1 分钟 20 次
    const emailLimit = await checkAndIncrementWindowLimitDistributed(
      `login:email:${email}`,
      5,
      10 * 60 * 1000,
    );
    if (!emailLimit.allowed) {
      return NextResponse.json({ success: false, message: "登录过于频繁，请稍后再试" }, { status: 429 });
    }

    const ipLimit = await checkAndIncrementWindowLimitDistributed(
      `login:ip:${clientIp}`,
      20,
      60 * 1000,
    );
    if (!ipLimit.allowed) {
      return NextResponse.json({ success: false, message: "请求过于频繁，请稍后再试" }, { status: 429 });
    }


    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        name: true,
        verified: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "邮箱或密码错误" }, { status: 401 });
    }

    if (!user.verified) {
      return NextResponse.json({ success: false, message: "邮箱未完成验证，请先注册并验证邮箱" }, { status: 400 });
    }

    if ((user.status || "active") !== "active") {
      return NextResponse.json({ success: false, message: "账号已被封禁或停用" }, { status: 403 });
    }

    const isPasswordValid = await verifyHash(password, user.password_hash ?? "");
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, message: "邮箱或密码错误" }, { status: 401 });
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          verified: user.verified,
          role: user.role,
          status: user.status,
        },
      },
      message: "登录成功",
    });

    attachAuthCookie(response, token);

    return response;
  } catch (error) {
    console.error("登录失败", error);
    return NextResponse.json({ success: false, message: "登录失败，请稍后再试" }, { status: 500 });
  }
}
