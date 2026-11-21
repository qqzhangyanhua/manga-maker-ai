import type { Prisma } from "@prisma/client";
import { getRechargePlan } from "@/lib/recharge-catalog";

/** 待支付订单的有效期。 */
export const RECHARGE_ORDER_TTL_MS = 30 * 60 * 1000;

export type RechargeOrderStatus = "pending" | "paid" | "expired" | "failed";

export interface RechargeOrderRecord {
  id: string;
  userId: string;
  planId: string;
  amountFen: number;
  credits: number;
  status: RechargeOrderStatus;
  createdAt: Date;
  expiresAt: Date;
  paidAt: Date | null;
}

/** 路由持有的数据库客户端。测试里这是会回滚的事务，所以这里不能再开事务。 */
export interface RechargeOrderDb {
  rechargeOrder: Prisma.TransactionClient["rechargeOrder"];
}

export type CreateRechargeOrderResult =
  | { ok: true; order: RechargeOrderRecord }
  | { ok: false; reason: "unknown_plan" };

interface RechargeOrderRow {
  id: string;
  user_id: string;
  plan_id: string;
  amount_fen: number;
  credits: number;
  status: string;
  created_at: Date;
  expires_at: Date;
  paid_at: Date | null;
}

function isStatus(status: string): status is RechargeOrderStatus {
  return status === "pending" || status === "paid" || status === "expired" || status === "failed";
}

function toRecord(row: RechargeOrderRow): RechargeOrderRecord {
  if (!isStatus(row.status)) {
    throw new Error(`未知的充值订单状态: ${row.status}`);
  }
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    amountFen: row.amount_fen,
    credits: row.credits,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
  };
}

/**
 * 按套餐目录创建待支付订单。金额和算力只来自目录，调用方传入的价格不会被读取。
 * 两个时间都在这里写入，避免数据库时钟和应用时钟不一致，把有效期拉偏。
 */
export async function createRechargeOrder(
  db: RechargeOrderDb,
  input: { userId: string; planId: string; now?: Date },
): Promise<CreateRechargeOrderResult> {
  const plan = getRechargePlan(input.planId);
  if (!plan) return { ok: false, reason: "unknown_plan" };

  const now = input.now ?? new Date();
  const created = await db.rechargeOrder.create({
    data: {
      user_id: input.userId,
      plan_id: plan.id,
      amount_fen: plan.priceFen,
      credits: plan.credits + (plan.bonus ?? 0),
      status: "pending",
      created_at: now,
      expires_at: new Date(now.getTime() + RECHARGE_ORDER_TTL_MS),
    },
  });

  return { ok: true, order: toRecord(created) };
}

export type GetRechargeOrderResult =
  | { ok: true; order: RechargeOrderRecord }
  | { ok: false; reason: "not_found" };

const ORDER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getRechargeOrder(
  db: RechargeOrderDb,
  input: { userId: string; orderId: string; now?: Date },
): Promise<GetRechargeOrderResult> {
  // 非法 UUID 会让 Prisma 抛查询错误。对调用方来说这就是订单不存在。
  if (!ORDER_ID_PATTERN.test(input.orderId)) {
    return { ok: false, reason: "not_found" };
  }

  const found = await db.rechargeOrder.findUnique({ where: { id: input.orderId } });
  if (!found || found.user_id !== input.userId) {
    return { ok: false, reason: "not_found" };
  }

  // 只有仍待支付且已过期的订单在读取时改成已过期。已支付的不因过期改状态。
  const now = input.now ?? new Date();
  if (found.status === "pending" && found.expires_at.getTime() <= now.getTime()) {
    const expired = await db.rechargeOrder.update({
      where: { id: found.id },
      data: { status: "expired" },
    });
    return { ok: true, order: toRecord(expired) };
  }

  return { ok: true, order: toRecord(found) };
}
