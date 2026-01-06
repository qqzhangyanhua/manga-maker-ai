/**
 * Credits System Tests
 *
 * 核心测试场景：
 * 1. 并发消耗算力（验证行级锁）
 * 2. 余额不足处理
 * 3. 算力增加/减少正确性
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { prisma } from "./db";
import {
  consumeCredits,
  addCredits,
  getUserCredits,
  InsufficientCreditsError,
  DEFAULT_REGISTER_CREDITS,
  checkCredits,
} from "./credits";

describe("Credits System", () => {
  const testUserId = "test-user-" + Date.now();

  beforeAll(async () => {
    // 创建测试用户
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${testUserId}@test.com`,
        credits: DEFAULT_REGISTER_CREDITS,
        total_credits_used: 0,
      },
    });
  });

  beforeEach(async () => {
    // 每个测试前重置用户余额
    await prisma.user.update({
      where: { id: testUserId },
      data: {
        credits: DEFAULT_REGISTER_CREDITS,
        total_credits_used: 0,
      },
    });

    // 清理交易记录
    await prisma.creditTransaction.deleteMany({
      where: { user_id: testUserId },
    });
  });

  describe("基础功能", () => {
    it("应该正确获取用户算力余额", async () => {
      const credits = await getUserCredits(testUserId);
      expect(credits).toBe(DEFAULT_REGISTER_CREDITS);
    });

    it("应该正确检查算力是否足够", async () => {
      expect(await checkCredits(testUserId, 1000)).toBe(true);
      expect(await checkCredits(testUserId, 5000)).toBe(false);
    });

    it("应该正确消耗算力并记录交易", async () => {
      const amount = 100;
      const result = await consumeCredits({
        userId: testUserId,
        amount,
        description: "测试消耗",
      });

      expect(result.consumed).toBe(amount);
      expect(result.newBalance).toBe(DEFAULT_REGISTER_CREDITS - amount);

      // 验证余额更新
      const credits = await getUserCredits(testUserId);
      expect(credits).toBe(DEFAULT_REGISTER_CREDITS - amount);

      // 验证交易记录
      const transactions = await prisma.creditTransaction.findMany({
        where: { user_id: testUserId },
      });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(-amount);
    });

    it("应该正确增加算力", async () => {
      const amount = 500;
      const result = await addCredits({
        userId: testUserId,
        amount,
        action: "recharge",
        description: "测试充值",
      });

      expect(result.added).toBe(amount);
      expect(result.newBalance).toBe(DEFAULT_REGISTER_CREDITS + amount);

      const credits = await getUserCredits(testUserId);
      expect(credits).toBe(DEFAULT_REGISTER_CREDITS + amount);
    });
  });

  describe("错误处理", () => {
    it("余额不足时应该抛出 InsufficientCreditsError", async () => {
      await expect(
        consumeCredits({
          userId: testUserId,
          amount: DEFAULT_REGISTER_CREDITS + 100,
          description: "超额消耗",
        })
      ).rejects.toThrow(InsufficientCreditsError);
    });

    it("InsufficientCreditsError 应该包含正确的错误信息", async () => {
      try {
        await consumeCredits({
          userId: testUserId,
          amount: 3000,
          description: "超额消耗",
        });
        expect.fail("应该抛出错误");
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientCreditsError);
        if (error instanceof InsufficientCreditsError) {
          expect(error.code).toBe("INSUFFICIENT_CREDITS");
          expect(error.required).toBe(3000);
          expect(error.available).toBe(DEFAULT_REGISTER_CREDITS);
        }
      }
    });

    it("消耗金额必须大于0", async () => {
      await expect(
        consumeCredits({
          userId: testUserId,
          amount: 0,
          description: "无效消耗",
        })
      ).rejects.toThrow("消耗算力必须大于0");
    });

    it("增加金额必须大于0", async () => {
      await expect(
        addCredits({
          userId: testUserId,
          amount: 0,
          action: "recharge",
        })
      ).rejects.toThrow("增加算力必须大于0");
    });

    it("用户不存在时应该抛出错误", async () => {
      await expect(
        consumeCredits({
          userId: "non-existent-user",
          amount: 100,
        })
      ).rejects.toThrow("用户不存在");
    });
  });

  describe("并发安全测试（关键）", () => {
    it("并发消耗时应该防止超额扣除（行级锁验证）", async () => {
      // 设置初始余额为 100
      await prisma.user.update({
        where: { id: testUserId },
        data: { credits: 100 },
      });

      // 尝试 10 个并发请求，每个消耗 50 算力
      // 理论上只有 2 个应该成功
      const promises = Array(10)
        .fill(null)
        .map(() =>
          consumeCredits({
            userId: testUserId,
            amount: 50,
            description: "并发测试",
          }).catch((err) => err)
        );

      const results = await Promise.all(promises);

      // 统计成功和失败的次数
      const successful = results.filter((r) => !(r instanceof Error));
      const failed = results.filter((r) => r instanceof InsufficientCreditsError);

      // 断言：只有2个成功，8个因余额不足失败
      expect(successful).toHaveLength(2);
      expect(failed).toHaveLength(8);

      // 验证最终余额为 0（100 - 50 - 50 = 0）
      const finalCredits = await getUserCredits(testUserId);
      expect(finalCredits).toBe(0);

      // 验证 total_credits_used 正确更新
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { total_credits_used: true },
      });
      expect(user?.total_credits_used).toBe(100);
    });

    it("并发增加算力应该正确累加", async () => {
      // 设置初始余额为 0
      await prisma.user.update({
        where: { id: testUserId },
        data: { credits: 0 },
      });

      // 10 个并发请求，每个增加 10 算力
      const promises = Array(10)
        .fill(null)
        .map(() =>
          addCredits({
            userId: testUserId,
            amount: 10,
            action: "recharge",
            description: "并发充值测试",
          })
        );

      await Promise.all(promises);

      // 最终余额应该是 100 (10 * 10)
      const finalCredits = await getUserCredits(testUserId);
      expect(finalCredits).toBe(100);
    });

    it("混合并发操作（增加+消耗）应该保持一致性", async () => {
      // 设置初始余额为 100
      await prisma.user.update({
        where: { id: testUserId },
        data: { credits: 100 },
      });

      // 5个增加操作（每个+20）和 5个消耗操作（每个-10）
      const addPromises = Array(5)
        .fill(null)
        .map(() =>
          addCredits({
            userId: testUserId,
            amount: 20,
            action: "recharge",
          })
        );

      const consumePromises = Array(5)
        .fill(null)
        .map(() =>
          consumeCredits({
            userId: testUserId,
            amount: 10,
          })
        );

      await Promise.all([...addPromises, ...consumePromises]);

      // 最终余额 = 100 + (5*20) - (5*10) = 100 + 100 - 50 = 150
      const finalCredits = await getUserCredits(testUserId);
      expect(finalCredits).toBe(150);
    });
  });

  describe("事务完整性", () => {
    it("消耗失败时不应该创建交易记录", async () => {
      const initialTransactionCount = await prisma.creditTransaction.count({
        where: { user_id: testUserId },
      });

      await expect(
        consumeCredits({
          userId: testUserId,
          amount: 9999,
        })
      ).rejects.toThrow();

      const finalTransactionCount = await prisma.creditTransaction.count({
        where: { user_id: testUserId },
      });

      expect(finalTransactionCount).toBe(initialTransactionCount);
    });

    it("余额和交易记录应该保持一致", async () => {
      // 执行多次操作
      await consumeCredits({ userId: testUserId, amount: 100 });
      await addCredits({ userId: testUserId, amount: 50, action: "recharge" });
      await consumeCredits({ userId: testUserId, amount: 30 });

      // 获取所有交易记录
      const transactions = await prisma.creditTransaction.findMany({
        where: { user_id: testUserId },
        orderBy: { created_at: "asc" },
      });

      // 验证最后一条记录的余额与当前余额一致
      const currentCredits = await getUserCredits(testUserId);
      const lastTransaction = transactions[transactions.length - 1];
      expect(lastTransaction.balance).toBe(currentCredits);

      // 验证计算：2000 - 100 + 50 - 30 = 1920
      expect(currentCredits).toBe(1920);
    });
  });
});
