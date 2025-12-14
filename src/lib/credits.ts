import { prisma, ensureDb } from "./db";

// 默认注册赠送算力
export const DEFAULT_REGISTER_CREDITS = 2000;

export type CreditAction =
  | "register"      // 注册赠送
  | "consume"       // AI调用消耗
  | "recharge"      // 充值
  | "admin_adjust"  // 管理员调整
  | "refund";       // 退款

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

export interface CreditError extends Error {
  code: "INSUFFICIENT_CREDITS";
  required: number;
  available: number;
}

/**
 * 获取用户当前算力余额
 */
export async function getUserCredits(userId: string): Promise<number> {
  await ensureDb();
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
  await ensureDb();
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
 * 消耗算力（带余额检查）
 * @throws CreditError 如果余额不足
 */
export async function consumeCredits(params: ConsumeCreditsParams): Promise<{
  newBalance: number;
  consumed: number;
}> {
  const { userId, amount, description, refType, refId } = params;

  if (amount <= 0) {
    throw new Error("消耗算力必须大于0");
  }

  await ensureDb();

  // 使用事务确保原子性
  const result = await prisma.$transaction(async (tx) => {
    // 获取当前余额并加锁
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true, total_credits_used: true },
    });

    if (!user) {
      throw new Error("用户不存在");
    }

    const currentCredits = user.credits;

    if (currentCredits < amount) {
      const error = new Error(`算力不足，需要 ${amount}，当前余额 ${currentCredits}`) as CreditError;
      error.code = "INSUFFICIENT_CREDITS";
      error.required = amount;
      error.available = currentCredits;
      throw error;
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

  return result;
}

/**
 * 增加算力（充值/赠送/管理员调整）
 */
export async function addCredits(params: AddCreditsParams): Promise<{
  newBalance: number;
  added: number;
}> {
  const { userId, amount, action, description, refType, refId } = params;

  if (amount <= 0) {
    throw new Error("增加算力必须大于0");
  }

  await ensureDb();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new Error("用户不存在");
    }

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

  return result;
}

/**
 * 初始化新用户算力（注册时调用）
 */
export async function initUserCredits(userId: string, credits?: number): Promise<void> {
  const amount = credits ?? DEFAULT_REGISTER_CREDITS;

  await ensureDb();

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
  await ensureDb();

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
 * 管理员调整用户算力
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

  await ensureDb();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new Error("用户不存在");
    }

    const newBalance = user.credits + amount;

    if (newBalance < 0) {
      throw new Error(`调整后余额不能为负数，当前余额 ${user.credits}`);
    }

    // 更新用户余额和累计消耗
    const updateData: { credits: number; total_credits_used?: number } = { credits: newBalance };
    if (amount < 0) {
      updateData.total_credits_used = { increment: Math.abs(amount) } as unknown as number;
    }

    await tx.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    });

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
    default:
      return "算力变动";
  }
}
