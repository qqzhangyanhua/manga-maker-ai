import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { confirmRechargeOrderPaid } from "@/lib/recharge-order";
import { presentRechargeOrder } from "../present-order";
import { isSimulatePayEnabled } from "../simulate-flag";

function readOrderId(body: unknown): string {
  if (typeof body !== "object" || body === null || !("orderId" in body)) return "";
  const { orderId } = body;
  return typeof orderId === "string" ? orderId.trim() : "";
}

/** 开关未开或处于生产环境时，表现得和接口不存在一样。 */
export async function POST(req: Request) {
  if (!isSimulatePayEnabled()) return notFoundResponse();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return unauthorizedResponse("未登录");

    const payload = verifyAuthToken(token);
    if (!payload?.userId) return unauthorizedResponse("无效的token");

    const orderId = readOrderId(await req.json());
    if (!orderId) return validationErrorResponse("缺少订单号");

    const result = await confirmRechargeOrderPaid(prisma, {
      userId: payload.userId,
      orderId,
    });
    if (!result.ok) return notFoundResponse("订单不存在");

    return successResponse(presentRechargeOrder(result.order, result.newBalance));
  } catch (error) {
    console.error("simulate-paid error:", error);
    return errorResponse("确认支付失败");
  }
}
