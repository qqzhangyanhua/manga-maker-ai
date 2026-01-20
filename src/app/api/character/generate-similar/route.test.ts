/**
 * /api/character/generate-similar 端点测试
 *
 * 测试生成相似角色变体功能（POST）
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import {
  createMockCookies,
  createMockAuthPayload,
  createMockCharacter,
} from "../test-helpers";

// Mock 模块
const { mockCookies } = vi.hoisted(() => {
  const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
  const mockCookies = vi.fn().mockResolvedValue({ get: mockCookiesGet });
  return { mockCookies, mockCookiesGet };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

vi.mock("@/lib/auth", () => ({
  AUTH_COOKIE_NAME: "comicai_session",
  verifyAuthToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/llm-provider", () => ({
  callChatCompletionByType: vi.fn(),
}));

vi.mock("@/lib/image-generation", () => ({
  callImageGenerationByType: vi.fn(),
}));

vi.mock("@/lib/usage", () => ({
  assertAndIncrementUsage: vi.fn(),
  QuotaExceededError: class QuotaExceededError extends Error {
    code: string;
    limit: number;
    count: number;

    constructor(message: string, limit: number, count: number) {
      super(message);
      this.code = "QUOTA_EXCEEDED";
      this.limit = limit;
      this.count = count;
      this.name = "QuotaExceededError";
    }
  },
}));

vi.mock("@/lib/generation-log", () => ({
  recordGenerationLog: vi.fn(),
}));

import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callChatCompletionByType } from "@/lib/llm-provider";
import { callImageGenerationByType } from "@/lib/image-generation";
import { assertAndIncrementUsage, QuotaExceededError } from "@/lib/usage";
import { recordGenerationLog } from "@/lib/generation-log";

describe("/api/character/generate-similar", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("POST /api/character/generate-similar", () => {
    it("应该成功生成单个相似角色变体", async () => {
      const mockCharacter = createMockCharacter({
        id: "char-123",
        name: "原角色",
        description: "A warrior with red hair",
        tags: ["warrior", "male"],
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "warrior with blue hair, anime style, detailed, high quality, 8k",
      });
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        images: ["base64-image-data-1"],
      });
      (recordGenerationLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          variation_prompt: "change hair to blue",
          count: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.generated_images).toHaveLength(1);
      expect(data.generated_images[0].image_url).toBe("base64-image-data-1");
      expect(data.original_character.name).toBe("原角色");
      expect(data.variation_prompt).toBe("change hair to blue");
      expect(data.message).toBe("成功生成 1 个角色变体");

      expect(assertAndIncrementUsage).toHaveBeenCalledWith({
        userId: "user-test-id-456",
        action: "image_generation",
        providerType: "image_generation",
        amount: 1,
      });

      expect(callChatCompletionByType).toHaveBeenCalledWith({
        providerType: "character_analyzer",
        messages: [
          { role: "system", content: expect.stringContaining("专业的角色设计师") },
          { role: "user", content: expect.stringContaining("change hair to blue") },
        ],
        temperature: 0.7,
        maxTokens: 800,
        options: { userId: "user-test-id-456" },
      });

      expect(callImageGenerationByType).toHaveBeenCalledWith({
        providerType: "image_generation",
        prompt: "warrior with blue hair, anime style, detailed, high quality, 8k",
        negative_prompt: expect.any(String),
        width: 512,
        height: 768,
        steps: 25,
        cfg_scale: 7.5,
        options: { userId: "user-test-id-456" },
      });
    });

    it("应该成功生成多个相似角色变体", async () => {
      const mockCharacter = createMockCharacter({
        id: "char-456",
        name: "魔法师",
        description: "A mage with staff",
        tags: ["mage"],
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 3,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "mage with crystal orb, anime style, detailed, 8k",
      });
      (callImageGenerationByType as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          success: true,
          images: ["base64-image-1"],
        })
        .mockResolvedValueOnce({
          success: true,
          images: ["base64-image-2"],
        })
        .mockResolvedValueOnce({
          success: true,
          images: ["base64-image-3"],
        });
      (recordGenerationLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-456",
          variation_prompt: "replace staff with crystal orb",
          count: 3,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.generated_images).toHaveLength(3);
      expect(data.message).toBe("成功生成 3 个角色变体");

      expect(assertAndIncrementUsage).toHaveBeenCalledWith({
        userId: "user-test-id-456",
        action: "image_generation",
        providerType: "image_generation",
        amount: 3,
      });

      expect(callImageGenerationByType).toHaveBeenCalledTimes(3);
    });

    it("应该在 LLM 优化失败时使用降级提示词", async () => {
      const mockCharacter = createMockCharacter({
        id: "char-789",
        name: "刺客",
        description: "A ninja assassin",
        tags: ["ninja"],
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("LLM service unavailable")
      );
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        images: ["base64-fallback-image"],
      });
      (recordGenerationLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-789",
          variation_prompt: "add dual blades",
          count: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.generated_images).toHaveLength(1);

      expect(callImageGenerationByType).toHaveBeenCalledWith({
        providerType: "image_generation",
        prompt: "A ninja assassin, add dual blades, anime style, detailed, high quality, 8k",
        negative_prompt: expect.any(String),
        width: 512,
        height: 768,
        steps: 25,
        cfg_scale: 7.5,
        options: { userId: "user-test-id-456" },
      });
    });

    it("应该拒绝缺少 character_id 的请求", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variation_prompt: "change hair color",
          count: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("角色ID不能为空");
    });

    it("应该拒绝缺少 variation_prompt 的请求", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          count: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("请输入变化描述");
    });

    it("应该拒绝空的 variation_prompt", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          variation_prompt: "   ",
          count: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("请输入变化描述");
    });

    it("应该拒绝无效的 count 值", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          variation_prompt: "change color",
          count: 5,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("生成数量只能是1、2或3");
    });

    it("应该返回 404 当角色不存在", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "non-existent",
          variation_prompt: "change color",
          count: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("角色不存在或无权访问");
    });

    it("应该返回 429 当配额超限", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockRejectedValue(
        new QuotaExceededError("超出每日配额", 50, 50)
      );

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          variation_prompt: "change color",
          count: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("超出每日配额");
      expect(data.code).toBe("QUOTA_EXCEEDED");
      expect(data.limit).toBe(50);
      expect(data.used).toBe(50);
    });

    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          variation_prompt: "change color",
          count: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("应该拒绝无效的 token", async () => {
      const mockCookiesGet = vi.fn().mockReturnValue({ value: "invalid-token" });
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          variation_prompt: "change color",
          count: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("无效的token");
    });

    it("应该处理部分图片生成失败的情况", async () => {
      const mockCharacter = createMockCharacter({
        id: "char-999",
        name: "测试角色",
        description: "Test character",
        tags: [],
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 3,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "test prompt, anime style, 8k",
      });
      (callImageGenerationByType as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          success: true,
          images: ["base64-image-1"],
        })
        .mockRejectedValueOnce(new Error("Generation failed"))
        .mockResolvedValueOnce({
          success: true,
          images: ["base64-image-3"],
        });
      (recordGenerationLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-999",
          variation_prompt: "test variation",
          count: 3,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.generated_images).toHaveLength(2);
      expect(data.message).toBe("成功生成 2 个角色变体");
    });

    it("应该返回 500 当所有图片生成都失败", async () => {
      const mockCharacter = createMockCharacter({
        id: "char-error",
        name: "错误角色",
        description: "Error character",
        tags: [],
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 2,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "error prompt",
      });
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("All generations failed")
      );
      (recordGenerationLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-error",
          variation_prompt: "test",
          count: 2,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("图片生成失败，请稍后重试");

      expect(recordGenerationLog).toHaveBeenCalledWith({
        userId: "user-test-id-456",
        action: "image_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: expect.any(Number),
        requestPayload: expect.any(Object),
        errorMessage: "图片生成失败",
      });
    });

    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database connection failed")
      );
      (recordGenerationLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/generate-similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          variation_prompt: "change color",
          count: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database connection failed");
    });
  });
});
