/**
 * POST /api/character/generate-expressions 端点测试
 *
 * 测试角色表情矩阵生成功能
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
    characterExpression: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/llm-provider", () => ({
  callChatCompletionByType: vi.fn(),
  ensureLlmProvider: vi.fn(),
}));

vi.mock("@/lib/expression-generation", () => ({
  generateExpression: vi.fn(),
  generateAllExpressions: vi.fn(),
  EXPRESSION_TYPES: ["neutral", "happy", "sad", "angry", "surprised", "fear", "disgust", "contempt", "smile"],
  EXPRESSION_LABELS: {
    neutral: "中性",
    happy: "开心",
    sad: "悲伤",
    angry: "愤怒",
    surprised: "惊讶",
    fear: "恐惧",
    disgust: "厌恶",
    contempt: "鄙视",
    smile: "微笑",
  },
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
import { generateExpression } from "@/lib/expression-generation";
import { minioClient, ensureBucketExists } from "@/lib/minio";
import { assertAndIncrementUsage, QuotaExceededError } from "@/lib/usage";
import { findBestReferenceImage } from "@/lib/character-reference";

describe("POST /api/character/generate-expressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("生成单个表情", () => {
    it("应该成功生成指定表情", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        description: "一个美丽的女孩",
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
        limit: 50,
      });
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "a beautiful girl, anime style",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateExpression as ReturnType<typeof vi.fn>).mockResolvedValue(
        "data:image/png;base64,test"
      );
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterExpression.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "expr-123",
        character_id: characterId,
        expression_type: "happy",
        image_url: "https://minio.example.com/test.png",
      });

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          expression_type: "happy",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.expressions).toHaveProperty("happy");
      expect(generateExpression).toHaveBeenCalledWith(
        expect.any(String),
        "happy",
        expect.any(String),
        null,
        expect.any(Object)
      );
    });
  });

  describe("生成全部表情", () => {
    it("应该生成所有9种表情", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        description: "测试角色",
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 9,
        limit: 50,
      });
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "test character",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateExpression as ReturnType<typeof vi.fn>).mockResolvedValue(
        "data:image/png;base64,test"
      );
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterExpression.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "expr-123",
        character_id: characterId,
        expression_type: "happy",
        image_url: "https://minio.example.com/test.png",
      });

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          generate_all: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("9");
      expect(generateExpression).toHaveBeenCalledTimes(9);
    });
  });

  describe("参考图使用", () => {
    it("应该使用角色的 base_image_url 作为参考图", async () => {
      const characterId = "char-123";
      const referenceUrl = "https://example.com/reference.png";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        reference_image: referenceUrl,
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
        limit: 50,
      });
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "optimized description",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(referenceUrl);
      (generateExpression as ReturnType<typeof vi.fn>).mockResolvedValue(
        "data:image/png;base64,test"
      );
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterExpression.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "expr-123",
        character_id: characterId,
        expression_type: "happy",
        image_url: "https://minio.example.com/test.png",
      });

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          expression_type: "happy",
        }),
      });

      await POST(request);

      expect(generateExpression).toHaveBeenCalledWith(
        expect.any(String),
        "happy",
        expect.any(String),
        referenceUrl,
        expect.any(Object)
      );
    });
  });

  describe("验证失败", () => {
    it("应该拒绝空的角色ID", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expression_type: "happy",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("角色ID");
    });

    it("应该拒绝未指定表情类型的请求", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("表情类型");
    });

    it("应该返回404当角色不存在", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "non-existent",
          expression_type: "happy",
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
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error("模型未配置"))
        .mockResolvedValueOnce(undefined);

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          expression_type: "happy",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("MODEL_NOT_CONFIGURED");
    });
  });

  describe("配额检查", () => {
    it("应该检查用户配额是否充足", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockRejectedValue(
        new QuotaExceededError("超出每日配额", 50, 50)
      );

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          expression_type: "happy",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe("QUOTA_EXCEEDED");
      expect(data.limit).toBe(50);
      expect(data.used).toBe(50);
    });

    it("应该为生成全部表情检查 9 次配额", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 9,
        limit: 50,
      });
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "test",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateExpression as ReturnType<typeof vi.fn>).mockResolvedValue(
        "data:image/png;base64,test"
      );
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterExpression.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "expr-123",
        character_id: characterId,
        expression_type: "happy",
        image_url: "https://minio.example.com/test.png",
      });

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          generate_all: true,
        }),
      });

      await POST(request);

      expect(assertAndIncrementUsage).toHaveBeenCalledWith({
        userId: expect.any(String),
        action: "image_generation",
        providerType: expect.any(String),
        amount: 9,
      });
    });
  });

  describe("认证失败", () => {
    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          expression_type: "happy",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });
  });

  describe("错误处理", () => {
    it("应该处理表情生成失败", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
        limit: 50,
      });
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "test",
      });
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateExpression as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Image generation failed")
      );
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          expression_type: "happy",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("生成表情失败");
    });

    it("应该在 LLM 优化失败时使用原始描述", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        description: "原始描述",
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
        limit: 50,
      });
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("LLM failed")
      );
      (findBestReferenceImage as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (generateExpression as ReturnType<typeof vi.fn>).mockResolvedValue(
        "data:image/png;base64,test"
      );
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterExpression.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "expr-123",
        character_id: characterId,
        expression_type: "happy",
        image_url: "https://minio.example.com/test.png",
      });

      const request = new Request("http://localhost/api/character/generate-expressions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          expression_type: "happy",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
