import { prisma } from "./db";
import { businessLogger } from "./logger";

// 默认注册赠送算力
export const DEFAULT_REGISTER_CREDITS = 2000;

export type CreditAction =
  | "register"      // 注册赠送
  | "consume"       // AI调用消耗
  | "recharge"      // 充值
  | "admin_adjust"  // 管理员调整
  | "refund"        // 退款
  | "freeze"        // 冻结算力
  | "settle";       // 结算

export type CreditRefType =
  | "generation_log"
  | "order"
  | "admin";

export interface ConsumeCreditsParams {
  userId: string;
  amount: number;
  description?: string;
  refType?: CreditRefType;
  refId?: string;
}

export interface AddCreditsParams {
  userId: string;
  amount: number;
  action: CreditAction;
  description?: string;
  refType?: CreditRefType;
  refId?: string;
}

/**
 * 自定义错误类：算力不足
 *
 * 使用继承 Error 的类，而不是类型转换
 */
export class InsufficientCreditsError extends Error {
  public readonly code = "INSUFFICIENT_CREDITS";

  constructor(
    public readonly required: number,
    public readonly available: number
  ) {
    super(`算力不足，需要 ${required}，当前余额 ${available}`);
    this.name = "InsufficientCreditsError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InsufficientCreditsError);
    }
  }
}

/**
 * 用户数据行接口（用于 $queryRaw 返回类型）
 */
interface UserCreditsRow {
  credits: number;
  total_credits_used: number;
}

/**
 * 获取用户当前算力余额
 */
export async function getUserCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return user?.credits ?? 0;
}

/**
 * 获取用户算力详情
 */
export async function getUserCreditsInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      total_credits_used: true,
    },
  });
  return {
    credits: user?.credits ?? 0,
    totalUsed: user?.total_credits_used ?? 0,
  };
}

/**
 * 检查用户算力是否足够
 */
export async function checkCredits(userId: string, required: number): Promise<boolean> {
  const credits = await getUserCredits(userId);
  return credits >= required;
}

/**
 * 消耗算力（带余额检查和行级锁）
 *
 * @security 使用 SELECT FOR UPDATE 防止并发竞态条件
 * @throws InsufficientCreditsError 如果余额不足
 */
export async function consumeCredits(params: ConsumeCreditsParams): Promise<{
  newBalance: number;
  consumed: number;
}> {
  const { userId, amount, description, refType, refId } = params;

  if (amount <= 0) {
    throw new Error("消耗算力必须大于0");
  }

  // 使用事务 + 行级锁确保原子性
  const result = await prisma.$transaction(async (tx) => {
    // 使用 SELECT FOR UPDATE 获取行级锁，防止并发修改
    const users = await tx.$queryRaw<UserCreditsRow[]>`
      SELECT credits, total_credits_used
      FROM users
      WHERE id = ${userId}::uuid
      FOR UPDATE
    `;

    if (!users || users.length === 0) {
      throw new Error("用户不存在");
    }

    const user = users[0];
    const currentCredits = user.credits;

    // 检查余额
    if (currentCredits < amount) {
      throw new InsufficientCreditsError(amount, currentCredits);
    }

    const newBalance = currentCredits - amount;

    // 更新用户余额
    await tx.user.update({
      where: { id: userId },
      data: {
        credits: newBalance,
        total_credits_used: (user.total_credits_used ?? 0) + amount,
      },
    });

    // 记录交易
    await tx.creditTransaction.create({
      data: {
        user_id: userId,
        amount: -amount, // 消耗为负数
        balance: newBalance,
        action: "consume",
        description: description ?? "AI调用消耗",
        ref_type: refType ?? null,
        ref_id: refId ?? null,
      },
    });

    return { newBalance, consumed: amount };
  });

  // 记录算力消耗
  businessLogger.credits("consumed", userId, amount, {
    newBalance: result.newBalance,
    description,
  });

  return result;
}

/**
 * 增加算力（充值/赠送/管理员调整）
 *
 * @security 使用行级锁防止并发问题
 */
export async function addCredits(params: AddCreditsParams): Promise<{
  newBalance: number;
  added: number;
}> {
  const { userId, amount, action, description, refType, refId } = params;

  if (amount <= 0) {
    throw new Error("增加算力必须大于0");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 使用 SELECT FOR UPDATE 获取行级锁
    const users = await tx.$queryRaw<UserCreditsRow[]>`
      SELECT credits
      FROM users
      WHERE id = ${userId}::uuid
      FOR UPDATE
    `;

    if (!users || users.length === 0) {
      throw new Error("用户不存在");
    }

    const user = users[0];
    const newBalance = user.credits + amount;

    // 更新用户余额
    await tx.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    });

    // 记录交易
    await tx.creditTransaction.create({
      data: {
        user_id: userId,
        amount: amount, // 增加为正数
        balance: newBalance,
        action,
        description: description ?? getDefaultDescription(action),
        ref_type: refType ?? null,
        ref_id: refId ?? null,
      },
    });

    return { newBalance, added: amount };
  });

  // 记录算力增加
  businessLogger.credits("added", userId, amount, {
    newBalance: result.newBalance,
    action,
    description,
  });

  return result;
}

/**
 * 初始化新用户算力（注册时调用）
 */
export async function initUserCredits(userId: string, credits?: number): Promise<void> {
  const amount = credits ?? DEFAULT_REGISTER_CREDITS;


  // 记录初始赠送的交易
  await prisma.creditTransaction.create({
    data: {
      user_id: userId,
      amount,
      balance: amount,
      action: "register",
      description: `注册赠送 ${amount} 算力`,
    },
  });
}

/**
 * 获取用户算力交易记录
 */
export async function getCreditTransactions(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: CreditAction;
  }
) {

  const { limit = 20, offset = 0, action } = options ?? {};

  const where = {
    user_id: userId,
    ...(action ? { action } : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.creditTransaction.count({ where }),
  ]);

  return {
    transactions,
    total,
    hasMore: offset + transactions.length < total,
  };
}

/**
 * 充值算力（管理员/支付系统调用）
 */
export async function rechargeCredits(params: {
  userId: string;
  amount: number;
  description?: string;
  refType?: string | null;
  refId?: string | null;
}): Promise<{ newBalance: number; added: number }> {
  const { userId, amount, description, refType, refId } = params;

  return addCredits({
    userId,
    amount,
    action: "recharge",
    description: description ?? `充值 ${amount} 算力`,
    refType: (refType as CreditRefType) ?? undefined,
    refId: refId ?? undefined,
  });
}

/**
 * 管理员调整用户算力
 *
 * @security 使用行级锁防止并发问题
 */
export async function adminAdjustCredits(params: {
  userId: string;
  amount: number; // 可正可负
  description: string;
  adminId: string;
}): Promise<{ newBalance: number }> {
  const { userId, amount, description, adminId } = params;

  if (amount === 0) {
    throw new Error("调整金额不能为0");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 使用 SELECT FOR UPDATE 获取行级锁
    const users = await tx.$queryRaw<UserCreditsRow[]>`
      SELECT credits, total_credits_used
      FROM users
      WHERE id = ${userId}::uuid
      FOR UPDATE
    `;

    if (!users || users.length === 0) {
      throw new Error("用户不存在");
    }

    const user = users[0];
    const newBalance = user.credits + amount;

    if (newBalance < 0) {
      throw new Error(`调整后余额不能为负数，当前余额 ${user.credits}`);
    }

    // 更新用户余额和累计消耗
    if (amount < 0) {
      // 如果是扣除，更新 total_credits_used
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: newBalance,
          total_credits_used: (user.total_credits_used ?? 0) + Math.abs(amount),
        },
      });
    } else {
      // 如果是增加，只更新 credits
      await tx.user.update({
        where: { id: userId },
        data: { credits: newBalance },
      });
    }

    // 记录交易
    await tx.creditTransaction.create({
      data: {
        user_id: userId,
        amount,
        balance: newBalance,
        action: "admin_adjust",
        description: `[管理员] ${description}`,
        ref_type: "admin",
        ref_id: adminId,
      },
    });

    return { newBalance };
  });

  return result;
}

function getDefaultDescription(action: CreditAction): string {
  switch (action) {
    case "register":
      return "注册赠送";
    case "consume":
      return "AI调用消耗";
    case "recharge":
      return "充值";
    case "admin_adjust":
      return "管理员调整";
    case "refund":
      return "退款";
    case "freeze":
      return "任务预估费用冻结";
    case "settle":
      return "任务结算";
    default:
      return "算力变动";
  }
}
