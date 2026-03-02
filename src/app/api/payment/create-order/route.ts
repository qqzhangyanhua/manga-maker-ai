import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { createOrder } from "@/lib/payment-order-store";

interface CreateOrderBody {
  planId: string;
  amount: number;
  credits: number;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const body: CreateOrderBody = await req.json();
    const { planId, amount, credits } = body;

    if (!planId || !amount || !credits) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    createOrder({
      orderId,
      userId: payload.userId,
      planId,
      amount,
      credits,
    });

    return NextResponse.json({
      success: true,
      orderId,
      amount,
      credits,
      qrCodeUrl: null,
      paymentMethods: ["wechat", "alipay"],
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("create-order error:", error);
    return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
  }
}
