import { prisma } from "./db";
import { businessLogger } from "./logger";
import { InsufficientCreditsError } from "./credits";

type FreezeStatus = "frozen" | "settled" | "refunded";

interface UserCreditsRow {
  credits: number;
  total_credits_used: number;
}

interface FreezeResult {
  freezeId: string;
  frozenAmount: number;
  remainingBalance: number;
}

interface SettleResult {
  transactionId: string;
  actualAmount: number;
  refundedAmount: number;
  newBalance: number;
}

/**
 * 冻结算力（任务开始前调用）
 *
 * 从用户可用余额中冻结预估费用。
 * 冻结记录通过 CreditTransaction 表记录，action 为 "freeze"。
 */
export async function freezeCredits(params: {
  userId: string;
  amount: number;
  taskId: string;
  description?: string;
}): Promise<FreezeResult> {
  const { userId, amount, taskId, description } = params;

  if (amount <= 0) {
    throw new Error("冻结金额必须大于0");
  }

  const result = await prisma.$transaction(async (tx) => {
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
    if (user.credits < amount) {
      throw new InsufficientCreditsError(amount, user.credits);
    }

    const newBalance = user.credits - amount;

    await tx.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    });

    const transaction = await tx.creditTransaction.create({
      data: {
        user_id: userId,
        amount: -amount,
        balance: newBalance,
        action: "freeze",
        description: description || `任务预估费用冻结`,
        ref_type: "generation_log",
        ref_id: taskId,
      },
    });

    return {
      freezeId: transaction.id,
      frozenAmount: amount,
      remainingBalance: newBalance,
    };
  });

  businessLogger.credits("frozen", userId, amount, {
    taskId,
    freezeId: result.freezeId,
    remainingBalance: result.remainingBalance,
  });

  return result;
}

/**
 * 结算冻结算力（任务成功后调用）
 *
 * 将冻结金额转为实际消耗。如果实际费用低于预估，差额退回。
 */
export async function settleFreeze(params: {
  userId: string;
  freezeId: string;
  actualAmount: number;
  taskId: string;
  description?: string;
}): Promise<SettleResult> {
  const { userId, freezeId, actualAmount, taskId, description } = params;

  if (actualAmount < 0) {
    throw new Error("实际金额不能为负数");
  }

  const result = await prisma.$transaction(async (tx) => {
    const freezeRecord = await tx.creditTransaction.findUnique({
      where: { id: freezeId },
    });

    if (!freezeRecord || freezeRecord.action !== "freeze") {
      throw new Error("冻结记录不存在或状态错误");
    }

    const frozenAmount = Math.abs(freezeRecord.amount);
    const refundAmount = Math.max(0, frozenAmount - actualAmount);

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
    const newBalance = user.credits + refundAmount;

    if (refundAmount > 0) {
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: newBalance,
          total_credits_used: (user.total_credits_used ?? 0) + actualAmount,
        },
      });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: {
          total_credits_used: (user.total_credits_used ?? 0) + actualAmount,
        },
      });
    }

    const transaction = await tx.creditTransaction.create({
      data: {
        user_id: userId,
        amount: refundAmount > 0 ? refundAmount : 0,
        balance: newBalance,
        action: "settle",
        description:
          description ||
          `任务结算：实际消耗 ${actualAmount}，退回 ${refundAmount}`,
        ref_type: "generation_log",
        ref_id: taskId,
      },
    });

    return {
      transactionId: transaction.id,
      actualAmount,
      refundedAmount: refundAmount,
      newBalance,
    };
  });

  businessLogger.credits("settled", userId, actualAmount, {
    taskId,
    freezeId,
    refundedAmount: result.refundedAmount,
  });

  return result;
}

/**
 * 回滚冻结算力（任务失败时调用）
 *
 * 将冻结的全部金额退回用户余额。
 */
export async function rollbackFreeze(params: {
  userId: string;
  freezeId: string;
  taskId: string;
  reason?: string;
}): Promise<{ newBalance: number; refundedAmount: number }> {
  const { userId, freezeId, taskId, reason } = params;

  const result = await prisma.$transaction(async (tx) => {
    const freezeRecord = await tx.creditTransaction.findUnique({
      where: { id: freezeId },
    });

    if (!freezeRecord || freezeRecord.action !== "freeze") {
      throw new Error("冻结记录不存在或状态错误");
    }

    const frozenAmount = Math.abs(freezeRecord.amount);

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
    const newBalance = user.credits + frozenAmount;

    await tx.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    });

    await tx.creditTransaction.create({
      data: {
        user_id: userId,
        amount: frozenAmount,
        balance: newBalance,
        action: "refund",
        description: reason || `任务失败退回冻结算力`,
        ref_type: "generation_log",
        ref_id: taskId,
      },
    });

    return { newBalance, refundedAmount: frozenAmount };
  });

  businessLogger.credits("rollback", userId, result.refundedAmount, {
    taskId,
    freezeId,
    reason,
  });

  return result;
}

/**
 * 预估图像生成费用
 */
export function estimateImageCost(
  quality: "standard" | "high" = "standard"
): number {
  return quality === "high" ? 20 : 10;
}

/**
 * 预估批量生成总费用
 */
export function estimateBatchCost(
  panelCount: number,
  quality: "standard" | "high" = "standard"
): number {
  return panelCount * estimateImageCost(quality);
}
