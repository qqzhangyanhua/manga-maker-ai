import type { RechargeOrderRecord } from "@/lib/recharge-order";

/** 下单和查询共用的订单响应。金额换成元，库存里仍然是分。已支付时带上最新余额。 */
export function presentRechargeOrder(order: RechargeOrderRecord, newBalance?: number) {
  return {
    orderId: order.id,
    amount: order.amountFen / 100,
    credits: order.credits,
    expiresAt: order.expiresAt.toISOString(),
    status: order.status,
    ...(newBalance === undefined ? {} : { newBalance }),
  };
}
