import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { createRechargeOrder } from "@/lib/recharge-order";
import { presentRechargeOrder } from "../present-order";

function readPlanId(body: unknown): string {
  if (typeof body !== "object" || body === null || !("planId" in body)) return "";
  const { planId } = body;
  return typeof planId === "string" ? planId.trim() : "";
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return unauthorizedResponse("未登录");

    const payload = verifyAuthToken(token);
    if (!payload?.userId) return unauthorizedResponse("无效的token");

    const planId = readPlanId(await req.json());
    const result = await createRechargeOrder(prisma, {
      userId: payload.userId,
      planId,
    });
    if (!result.ok) return validationErrorResponse("未知套餐");

    return successResponse(presentRechargeOrder(result.order));
  } catch (error) {
    console.error("create-order error:", error);
    return errorResponse("创建订单失败");
  }
}
