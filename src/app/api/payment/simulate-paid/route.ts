import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { getOrder, markOrderPaid } from "@/lib/payment-order-store";
import { addCredits } from "@/lib/credits";

/**
 * 模拟支付完成（占位实现，用于演示支付流程）
 * 生产环境应由支付网关回调触发
 */
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const orderId = body?.orderId as string | undefined;
    if (!orderId) {
      return NextResponse.json({ error: "缺少订单ID" }, { status: 400 });
    }

    const order = getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    if (order.userId !== payload.userId) {
      return NextResponse.json({ error: "无权限操作该订单" }, { status: 403 });
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { error: "订单已处理", status: order.status },
        { status: 400 }
      );
    }

    markOrderPaid(orderId);

    const { newBalance } = await addCredits({
      userId: payload.userId,
      amount: order.credits,
      action: "recharge",
      description: `充值 ${order.credits} 算力`,
      refType: "order",
      refId: orderId,
    });

    return NextResponse.json({
      success: true,
      orderId,
      status: "paid",
      newBalance,
      credits: order.credits,
    });
  } catch (error) {
    console.error("simulate-paid error:", error);
    return NextResponse.json({ error: "处理失败" }, { status: 500 });
  }
}
