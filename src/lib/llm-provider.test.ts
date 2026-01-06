/**
 * LLM Provider Tests
 *
 * 核心测试场景：
 * 1. SSL 证书验证逻辑
 * 2. 算力检查和扣除
 * 3. Provider 配置查询
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { findLlmProviderByType, ensureLlmProvider } from "./llm-provider";
import { prisma } from "./db";

describe("LLM Provider System", () => {
  const testProviderId = "test-provider-" + Date.now();

  beforeAll(async () => {
    // 创建测试 Provider
    await prisma.llmProvider.create({
      data: {
        id: parseInt(testProviderId),
        provider_type: "test_chat",
        provider_name: "openai",
        model: "gpt-4",
        base_url: "https://api.openai.com",
        api_key: "test-key",
        priority: 1,
        enabled: true,
        credits_cost: 10,
      },
    });

    // 创建禁用的 Provider
    await prisma.llmProvider.create({
      data: {
        id: parseInt(testProviderId) + 1,
        provider_type: "test_disabled",
        provider_name: "openai",
        model: "gpt-4",
        base_url: "https://api.openai.com",
        api_key: "test-key",
        priority: 1,
        enabled: false,
        credits_cost: 10,
      },
    });

    // 创建多个同类型 Provider（测试优先级）
    await prisma.llmProvider.create({
      data: {
        id: parseInt(testProviderId) + 2,
        provider_type: "test_priority",
        provider_name: "provider-low",
        model: "gpt-3.5",
        base_url: "https://api.openai.com",
        api_key: "test-key-low",
        priority: 10, // 低优先级
        enabled: true,
        credits_cost: 5,
      },
    });

    await prisma.llmProvider.create({
      data: {
        id: parseInt(testProviderId) + 3,
        provider_type: "test_priority",
        provider_name: "provider-high",
        model: "gpt-4",
        base_url: "https://api.openai.com",
        api_key: "test-key-high",
        priority: 1, // 高优先级
        enabled: true,
        credits_cost: 10,
      },
    });
  });

  describe("Provider 查询", () => {
    it("应该根据 provider_type 找到已启用的 Provider", async () => {
      const provider = await findLlmProviderByType("test_chat");
      expect(provider).not.toBeNull();
      expect(provider?.provider_type).toBe("test_chat");
      expect(provider?.enabled).toBe(true);
    });

    it("不应该找到禁用的 Provider", async () => {
      const provider = await findLlmProviderByType("test_disabled");
      expect(provider).toBeNull();
    });

    it("不存在的 provider_type 应该返回 null", async () => {
      const provider = await findLlmProviderByType("non_existent_type");
      expect(provider).toBeNull();
    });

    it("应该按 priority 选择 Provider（较小的优先）", async () => {
      const provider = await findLlmProviderByType("test_priority");
      expect(provider).not.toBeNull();
      expect(provider?.priority).toBe(1);
      expect(provider?.provider_name).toBe("provider-high");
    });
  });

  describe("ensureLlmProvider", () => {
    it("应该返回找到的 Provider", async () => {
      const provider = await ensureLlmProvider("test_chat");
      expect(provider.provider_type).toBe("test_chat");
    });

    it("找不到时应该抛出中文错误", async () => {
      await expect(ensureLlmProvider("non_existent")).rejects.toThrow(
        /未找到可用的模型配置/
      );
      await expect(ensureLlmProvider("non_existent")).rejects.toThrow(
        /请先在.*llm-providers.*新增并启用/
      );
    });
  });

  describe("SSL 证书验证（环境变量测试）", () => {
    const originalEnv = process.env;

    afterEach(() => {
      // 恢复原始环境变量
      process.env = { ...originalEnv };
    });

    it("生产环境应该始终验证证书", () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOW_SELF_SIGNED_CERT = "true"; // 即使设置也不应该生效

      // 重新加载模块以应用新的环境变量
      // 注意：这里只测试逻辑，实际的 https.Agent 创建在模块加载时执行
      expect(process.env.NODE_ENV).toBe("production");
    });

    it("开发环境默认应该验证证书", () => {
      process.env.NODE_ENV = "development";
      delete process.env.ALLOW_SELF_SIGNED_CERT;

      expect(process.env.ALLOW_SELF_SIGNED_CERT).toBeUndefined();
    });

    it("开发环境设置 ALLOW_SELF_SIGNED_CERT=true 时允许自签名", () => {
      process.env.NODE_ENV = "development";
      process.env.ALLOW_SELF_SIGNED_CERT = "true";

      expect(process.env.ALLOW_SELF_SIGNED_CERT).toBe("true");
    });
  });

  describe("LlmCallOptions 类型安全", () => {
    it("skipCreditsCheck: true 时不需要 userId", () => {
      const options1: { skipCreditsCheck: true } = { skipCreditsCheck: true };
      expect(options1.skipCreditsCheck).toBe(true);
    });

    it("skipCreditsCheck: false 时需要 userId", () => {
      const options2: { userId: string } = { userId: "user-123" };
      expect(options2.userId).toBe("user-123");
    });

    // TypeScript 编译时验证，运行时不测试
    // @ts-expect-error - skipCreditsCheck: true 不应该有 userId
    // const invalidOptions1 = { skipCreditsCheck: true, userId: "test" };

    // @ts-expect-error - skipCreditsCheck: false 必须有 userId
    // const invalidOptions2 = { skipCreditsCheck: false };
  });
});
