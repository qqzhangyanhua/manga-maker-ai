/**
 * POST /api/character/generate-views 端点测试
 *
 * 测试三视图生成功能
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import {
  createMockCharacterWithRelations,
  createMockCookies,
  createMockAuthPayload,
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
    characterView: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/llm-provider", () => ({
  callChatCompletionByType: vi.fn(),
  ensureLlmProvider: vi.fn(),
}));

vi.mock("@/lib/image-generation", () => ({
  generateCharacterViews: vi.fn(),
  base64ToBuffer: vi.fn((base64: string) => {
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, "base64");
  }),
}));

vi.mock("@/lib/minio", () => ({
  minioClient: {
    putObject: vi.fn(),
  },
  MINIO_BUCKET: "test-bucket",
  ensureBucketExists: vi.fn(),
  getPublicUrl: vi.fn((objectName: string) => `https://minio.example.com/${objectName}`),
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
    }
  },
}));

vi.mock("@/lib/generation-log", () => ({
  recordGenerationLog: vi.fn(),
}));

vi.mock("@/lib/character-reference", () => ({
  findBestReferenceImage: vi.fn(),
}));

import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureLlmProvider, callChatCompletionByType } from "@/lib/llm-provider";
import { generateCharacterViews } from "@/lib/image-generation";
import { minioClient, ensureBucketExists } from "@/lib/minio";
import { assertAndIncrementUsage, QuotaExceededError } from "@/lib/usage";
import { findBestReferenceImage } from "@/lib/character-reference";

describe("POST /api/character/generate-views", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("生成全部三视图", () => {
    it("应该成功生成三视图", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        description: "一个美丽的女孩",
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 3,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "a beautiful girl, anime style, detailed",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateCharacterViews as ReturnType<typeof vi.fn>).mockResolvedValue({
        views: {
          front: "data:image/png;base64,frontImage",
          side: "data:image/png;base64,sideImage",
          back: "data:image/png;base64,backImage",
        },
        prompts: {
          front: "front view prompt",
          side: "side view prompt",
          back: "back view prompt",
        },
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterView.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "view-123",
        character_id: characterId,
        view_type: "front",
        image_url: "https://minio.example.com/test.png",
      });

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          description: "一个美丽的女孩",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.views).toBeDefined();
      expect(Object.keys(data.views)).toEqual(['front', 'side', 'back']);
      expect(data.message).toContain("三视图生成成功");
      expect(generateCharacterViews).toHaveBeenCalled();
      expect(minioClient.putObject).toHaveBeenCalledTimes(3);
      expect(prisma.characterView.upsert).toHaveBeenCalledTimes(3);
    });

    it("应该计算正确的配额（3个视图 = 3 额度）", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 3,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "optimized",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateCharacterViews as ReturnType<typeof vi.fn>).mockResolvedValue({
        views: {
          front: "data:image/png;base64,test",
          side: "data:image/png;base64,test",
          back: "data:image/png;base64,test",
        },
        prompts: { front: "f", side: "s", back: "b" },
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterView.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "view-123",
        character_id: characterId,
        view_type: "front",
        image_url: "https://minio.example.com/test.png",
      });

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
        }),
      });

      await POST(request);

      expect(assertAndIncrementUsage).toHaveBeenCalledWith({
        userId: expect.any(String),
        action: "image_generation",
        providerType: expect.any(String),
        amount: 3,
      });
    });
  });

  describe("生成指定视图", () => {
    it("应该只生成指定的视图（front, side）", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 2,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "optimized",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateCharacterViews as ReturnType<typeof vi.fn>).mockResolvedValue({
        views: {
          front: "data:image/png;base64,test",
          side: "data:image/png;base64,test",
        },
        prompts: { front: "f", side: "s" },
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterView.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "view-123",
        character_id: characterId,
        view_type: "front",
        image_url: "https://minio.example.com/test.png",
      });

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          view_types: ["front", "side"],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Object.keys(data.views)).toEqual(['front', 'side']);
      expect(data.message).toContain("正面、侧面视图生成成功");
      expect(minioClient.putObject).toHaveBeenCalledTimes(2);
    });

    it("应该拒绝无效的 view_types", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          view_types: ["invalid", "unknown"],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("无效的 view_types 参数");
    });
  });

  describe("LLM 优化描述", () => {
    it("应该使用 LLM 优化角色描述", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        description: "女孩",
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 3,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "a beautiful girl, anime style, detailed, 8k",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateCharacterViews as ReturnType<typeof vi.fn>).mockResolvedValue({
        views: {
          front: "data:image/png;base64,test",
          side: "data:image/png;base64,test",
          back: "data:image/png;base64,test",
        },
        prompts: { front: "f", side: "s", back: "b" },
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterView.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "view-123",
        character_id: characterId,
        view_type: "front",
        image_url: "https://minio.example.com/test.png",
      });

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
        }),
      });

      await POST(request);

      expect(callChatCompletionByType).toHaveBeenCalled();
      expect(generateCharacterViews).toHaveBeenCalledWith(
        "a beautiful girl, anime style, detailed, 8k",
        expect.any(String),
        null,
        ["front", "side", "back"],
        expect.any(String)
      );
    });

    it("应该在 LLM 优化失败时使用原始描述", async () => {
      const characterId = "char-123";
      const originalDesc = "测试角色";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        description: originalDesc,
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 3,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("LLM failed")
      );
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateCharacterViews as ReturnType<typeof vi.fn>).mockResolvedValue({
        views: {
          front: "data:image/png;base64,test",
          side: "data:image/png;base64,test",
          back: "data:image/png;base64,test",
        },
        prompts: { front: "f", side: "s", back: "b" },
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterView.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "view-123",
        character_id: characterId,
        view_type: "front",
        image_url: "https://minio.example.com/test.png",
      });

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(generateCharacterViews).toHaveBeenCalledWith(
        originalDesc,
        expect.any(String),
        null,
        ["front", "side", "back"],
        expect.any(String)
      );
    });
  });

  describe("参考图使用", () => {
    it("应该使用角色的参考图", async () => {
      const characterId = "char-123";
      const referenceUrl = "https://example.com/reference.png";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        reference_image: referenceUrl,
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 3,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "optimized",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(referenceUrl);
      (generateCharacterViews as ReturnType<typeof vi.fn>).mockResolvedValue({
        views: {
          front: "data:image/png;base64,test",
          side: "data:image/png;base64,test",
          back: "data:image/png;base64,test",
        },
        prompts: { front: "f", side: "s", back: "b" },
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterView.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "view-123",
        character_id: characterId,
        view_type: "front",
        image_url: "https://minio.example.com/test.png",
      });

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
        }),
      });

      await POST(request);

      expect(findBestReferenceImage).toHaveBeenCalled();
      expect(generateCharacterViews).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        referenceUrl,
        ["front", "side", "back"],
        expect.any(String)
      );
    });
  });

  describe("验证失败", () => {
    it("应该拒绝空的角色ID", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("角色ID");
    });

    it("应该返回404当角色不存在", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 3,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "non-existent",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("角色不存在");
    });
  });

  describe("模型配置检查", () => {
    it("应该检查图片生成模型是否配置", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      // 第一个 ensureLlmProvider 调用（图片生成模型）失败
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("图片生成模型未配置")
      );

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("MODEL_NOT_CONFIGURED");
    });

    it("应该检查提示词模型是否配置", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      let callCount = 0;
      // 模拟两次 ensureLlmProvider 调用：第一次成功，第二次失败
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // 第一次调用（图片生成模型）成功
          return Promise.resolve(undefined);
        } else {
          // 第二次调用（提示词模型）失败
          return Promise.reject(new Error("提示词模型未配置"));
        }
      });

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("MODEL_NOT_CONFIGURED");
      expect(data.provider_type).toBe("storyboard");
    });
  });

  describe("配额检查", () => {
    it("应该检查用户配额是否充足", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockRejectedValue(
        new QuotaExceededError("超出每日配额", 50, 50)
      );

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe("QUOTA_EXCEEDED");
      expect(data.limit).toBe(50);
      expect(data.used).toBe(50);
    });
  });

  describe("认证失败", () => {
    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
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

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("无效的token");
    });
  });

  describe("错误处理", () => {
    it("应该处理图片生成失败", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 3,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "optimized",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateCharacterViews as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Image generation failed")
      );

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 3,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database connection error")
      );

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("应该处理 MinIO 上传失败", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 3,
        limit: 50,
      });
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "optimized",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateCharacterViews as ReturnType<typeof vi.fn>).mockResolvedValue({
        views: {
          front: "data:image/png;base64,test",
          side: "data:image/png;base64,test",
          back: "data:image/png;base64,test",
        },
        prompts: { front: "f", side: "s", back: "b" },
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("MinIO connection failed")
      );

      const request = new Request("http://localhost/api/character/generate-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
