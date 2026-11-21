import type { Prisma, PrismaClient } from "@prisma/client";
import { addCredits } from "@/lib/credits";
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

  // 条件写只改仍待支付的行。并发确认已经写成已支付时再读一次，不能覆盖成已过期。
  const now = input.now ?? new Date();
  if (found.status === "pending" && found.expires_at.getTime() <= now.getTime()) {
    await db.rechargeOrder.updateMany({
      where: { id: found.id, status: "pending" },
      data: { status: "expired" },
    });
    const current = await db.rechargeOrder.findUnique({ where: { id: found.id } });
    if (!current || current.user_id !== input.userId) {
      return { ok: false, reason: "not_found" };
    }
    return { ok: true, order: toRecord(current) };
  }

  return { ok: true, order: toRecord(found) };
}

export type ConfirmRechargeOrderResult =
  | { ok: true; order: RechargeOrderRecord; newBalance?: number }
  | { ok: false; reason: "not_found" };

type RechargeOrderClient = PrismaClient | Prisma.TransactionClient;

const CONFIRM_SAVEPOINT = "recharge_confirm";

function opensOwnTransaction(db: RechargeOrderClient): db is PrismaClient {
  return "$transaction" in db && typeof db.$transaction === "function";
}

/**
 * 测试通道的客户端本身就是事务，没有嵌套的 $transaction。
 * 保存点只撤销这一次确认，外层测试事务继续，失败后订单仍是待支付。
 */
async function withSavepoint<T>(
  db: Prisma.TransactionClient,
  work: () => Promise<T>,
): Promise<T> {
  await db.$executeRawUnsafe(`SAVEPOINT ${CONFIRM_SAVEPOINT}`);
  try {
    const result = await work();
    await db.$executeRawUnsafe(`RELEASE SAVEPOINT ${CONFIRM_SAVEPOINT}`);
    return result;
  } catch (error) {
    await db.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${CONFIRM_SAVEPOINT}`);
    await db.$executeRawUnsafe(`RELEASE SAVEPOINT ${CONFIRM_SAVEPOINT}`);
    throw error;
  }
}

async function confirmWithin(
  db: Prisma.TransactionClient,
  input: { userId: string; orderId: string; now: Date },
): Promise<ConfirmRechargeOrderResult> {
  if (!ORDER_ID_PATTERN.test(input.orderId)) {
    return { ok: false, reason: "not_found" };
  }

  // 条件更新只命中仍待支付且未过期的订单。并发确认时只有一条更新成功。
  const updated = await db.rechargeOrder.updateMany({
    where: {
      id: input.orderId,
      user_id: input.userId,
      status: "pending",
      expires_at: { gt: input.now },
    },
    data: {
      status: "paid",
      paid_at: input.now,
    },
  });

  if (updated.count !== 1) {
    const current = await getRechargeOrder(db, input);
    if (!current.ok || current.order.status !== "paid") return current;
    const balance = await db.user.findUnique({
      where: { id: input.userId },
      select: { credits: true },
    });
    return { ok: true, order: current.order, newBalance: balance?.credits ?? 0 };
  }

  const paid = await db.rechargeOrder.findUnique({ where: { id: input.orderId } });
  if (!paid || paid.user_id !== input.userId) {
    return { ok: false, reason: "not_found" };
  }

  const order = toRecord(paid);
  const credited = await addCredits(
    {
      userId: input.userId,
      amount: order.credits,
      action: "recharge",
      refType: "order",
      refId: order.id,
      description: `充值 ${order.credits} 算力`,
    },
    db,
  );

  return { ok: true, order, newBalance: credited.newBalance };
}

/**
 * 确认订单已支付。和算力到账在同一个事务里：到账失败时订单仍是待支付。
 * 条件未命中时不到账，返回订单当前状态；订单不属于该用户时视为不存在。
 */
export async function confirmRechargeOrderPaid(
  db: RechargeOrderClient,
  input: { userId: string; orderId: string; now?: Date },
): Promise<ConfirmRechargeOrderResult> {
  const now = input.now ?? new Date();

  if (opensOwnTransaction(db)) {
    return db.$transaction((tx) => confirmWithin(tx, { ...input, now }));
  }

  return withSavepoint(db, () => confirmWithin(db, { ...input, now }));
}
