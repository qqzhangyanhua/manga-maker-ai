import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { getOrder } from "@/lib/payment-order-store";
import { getUserCredits } from "@/lib/credits";

export async function GET(req: NextRequest) {
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

    const orderId = req.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ error: "缺少订单ID" }, { status: 400 });
    }

    const order = getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    if (order.userId !== payload.userId) {
      return NextResponse.json({ error: "无权限查看该订单" }, { status: 403 });
    }

    const message =
      order.status === "pending"
        ? "等待支付"
        : order.status === "paid"
          ? "支付成功"
          : order.status === "expired"
            ? "订单已过期"
            : "支付失败";

    const newBalance =
      order.status === "paid" ? await getUserCredits(order.userId) : undefined;

    return NextResponse.json({
      success: true,
      orderId,
      status: order.status,
      message,
      credits: order.status === "paid" ? order.credits : undefined,
      newBalance,
    });
  } catch (error) {
    console.error("check-order error:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
