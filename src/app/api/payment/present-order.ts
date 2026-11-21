import type { RechargeOrderRecord } from "@/lib/recharge-order";

/** 下单和查询共用的订单响应。金额换成元，库存里仍然是分。 */
export function presentRechargeOrder(order: RechargeOrderRecord) {
  return {
    orderId: order.id,
    amount: order.amountFen / 100,
    credits: order.credits,
    expiresAt: order.expiresAt.toISOString(),
    status: order.status,
  };
}
