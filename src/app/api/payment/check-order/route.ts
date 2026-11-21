import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { getUserCredits } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { getRechargeOrder } from "@/lib/recharge-order";
import { presentRechargeOrder } from "../present-order";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return unauthorizedResponse("未登录");

    const payload = verifyAuthToken(token);
    if (!payload?.userId) return unauthorizedResponse("无效的token");

    const orderId = new URL(req.url).searchParams.get("orderId")?.trim() ?? "";
    if (!orderId) return validationErrorResponse("缺少订单号");

    const result = await getRechargeOrder(prisma, {
      userId: payload.userId,
      orderId,
    });
    if (!result.ok) return notFoundResponse("订单不存在");

    const newBalance =
      result.order.status === "paid" ? await getUserCredits(payload.userId) : undefined;
    return successResponse(presentRechargeOrder(result.order, newBalance));
  } catch (error) {
    console.error("check-order error:", error);
    return errorResponse("查询订单失败");
  }
}
