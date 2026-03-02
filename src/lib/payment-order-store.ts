/**
 * 支付订单内存存储（占位实现，用于模拟支付流程）
 * 生产环境应使用数据库存储
 */

export interface PaymentOrder {
  orderId: string;
  userId: string;
  planId: string;
  amount: number;
  credits: number;
  status: "pending" | "paid" | "expired" | "failed";
  createdAt: number;
}

const orders = new Map<string, PaymentOrder>();

export function createOrder(order: Omit<PaymentOrder, "status" | "createdAt">): PaymentOrder {
  const full: PaymentOrder = {
    ...order,
    status: "pending",
    createdAt: Date.now(),
  };
  orders.set(order.orderId, full);
  return full;
}

export function getOrder(orderId: string): PaymentOrder | undefined {
  return orders.get(orderId);
}

export function markOrderPaid(orderId: string): PaymentOrder | undefined {
  const order = orders.get(orderId);
  if (!order || order.status !== "pending") return undefined;
  order.status = "paid";
  return order;
}
