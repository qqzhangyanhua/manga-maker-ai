/**
 * POST /api/character/outfits 端点测试
 *
 * 测试角色装备创建功能
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import {
  createMockCharacterWithRelations,
  createMockCookies,
  createMockAuthPayload,
  createMockOutfit,
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
    characterOutfit: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/llm-provider", () => ({
  callChatCompletionByType: vi.fn(),
  ensureLlmProvider: vi.fn(),
}));

vi.mock("@/lib/outfit-generation", () => ({
  generateOutfit: vi.fn(),
  OUTFIT_TYPES: {
    default: "默认装",
    casual: "休闲装",
    formal: "正装",
    sport: "运动装",
    traditional: "传统服饰",
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

vi.mock("@/lib/image-generation", () => ({
  base64ToBuffer: vi.fn((base64: string) => Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64")),
}));

import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureLlmProvider, callChatCompletionByType } from "@/lib/llm-provider";
import { generateOutfit } from "@/lib/outfit-generation";
import { minioClient, ensureBucketExists } from "@/lib/minio";
import { assertAndIncrementUsage, QuotaExceededError } from "@/lib/usage";

describe("POST /api/character/outfits", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("创建装备（不生成图片）", () => {
    it("应该成功创建装备元数据", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        description: "测试角色",
      });
      const mockOutfit = createMockOutfit({
        character_id: characterId,
        outfit_name: "休闲装",
        outfit_type: "casual",
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterOutfit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.characterOutfit.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockOutfit);

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          outfit_name: "休闲装",
          outfit_type: "casual",
          generate_image: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.outfit).toBeDefined();
      expect(data.outfit.outfit_name).toBe("休闲装");
      expect(generateOutfit).not.toHaveBeenCalled();
    });

    it("应该使用 LLM 简化装备描述", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });
      const mockOutfit = createMockOutfit({ character_id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: "blue suit, formal",
      });
      (prisma.characterOutfit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.characterOutfit.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockOutfit);

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          outfit_name: "正装",
          outfit_type: "formal",
          description: "蓝色西装",
          generate_image: false,
        }),
      });

      await POST(request);

      expect(callChatCompletionByType).toHaveBeenCalled();
      expect(prisma.characterOutfit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prompt_modifier: "blue suit, formal",
        }),
      });
    });
  });

  describe("创建装备并生成图片", () => {
    it("应该生成装备图片并上传到 MinIO", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        base_image_url: "https://example.com/base.png",
      });
      const mockOutfit = createMockOutfit({ character_id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
        limit: 50,
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (generateOutfit as ReturnType<typeof vi.fn>).mockResolvedValue(
        "data:image/png;base64,test"
      );
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterOutfit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.characterOutfit.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockOutfit);

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          outfit_name: "测试装",
          outfit_type: "casual",
          generate_image: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(generateOutfit).toHaveBeenCalled();
      expect(minioClient.putObject).toHaveBeenCalled();
      expect(data.message).toContain("图片已生成");
    });

    it("应该使用角色的 base_image_url 作为参考图", async () => {
      const characterId = "char-123";
      const referenceUrl = "https://example.com/base.png";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        base_image_url: referenceUrl,
      });
      const mockOutfit = createMockOutfit({ character_id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
        limit: 50,
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (generateOutfit as ReturnType<typeof vi.fn>).mockResolvedValue(
        "data:image/png;base64,test"
      );
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterOutfit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.characterOutfit.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockOutfit);

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          outfit_name: "测试装",
          outfit_type: "casual",
          generate_image: true,
        }),
      });

      await POST(request);

      expect(generateOutfit).toHaveBeenCalledWith(
        expect.any(String),
        "casual",
        undefined,
        expect.any(String),
        referenceUrl,
        expect.any(Object)
      );
    });
  });

  describe("默认装处理", () => {
    it("应该在创建默认装时取消其他装备的默认状态", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });
      const mockOutfit = createMockOutfit({
        character_id: characterId,
        outfit_type: "default",
        is_default: true,
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterOutfit.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
      });
      (prisma.characterOutfit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.characterOutfit.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockOutfit);

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          outfit_name: "默认装",
          outfit_type: "default",
          generate_image: false,
        }),
      });

      await POST(request);

      expect(prisma.characterOutfit.updateMany).toHaveBeenCalledWith({
        where: {
          character_id: characterId,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });
    });
  });

  describe("装备更新", () => {
    it("应该更新已存在的同类型装备", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });
      const existingOutfit = createMockOutfit({
        id: "outfit-existing",
        character_id: characterId,
        outfit_type: "casual",
      });
      const updatedOutfit = { ...existingOutfit, outfit_name: "新休闲装" };

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.characterOutfit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        existingOutfit
      );
      (prisma.characterOutfit.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedOutfit);

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          outfit_name: "新休闲装",
          outfit_type: "casual",
          generate_image: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("更新成功");
      expect(prisma.characterOutfit.update).toHaveBeenCalledWith({
        where: { id: "outfit-existing" },
        data: expect.objectContaining({
          outfit_name: "新休闲装",
        }),
      });
    });
  });

  describe("验证失败", () => {
    it("应该拒绝缺少必需字段的请求", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("不能为空");
    });

    it("应该返回404当角色不存在", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "non-existent",
          outfit_name: "测试装",
          outfit_type: "casual",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("角色不存在");
    });
  });

  describe("模型配置检查", () => {
    it("应该检查提示词模型是否配置", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("模型未配置")
      );

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          outfit_name: "测试装",
          outfit_type: "casual",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("MODEL_NOT_CONFIGURED");
    });
  });

  describe("配额检查", () => {
    it("应该在生成图片时检查配额", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (assertAndIncrementUsage as ReturnType<typeof vi.fn>).mockRejectedValue(
        new QuotaExceededError("超出每日配额", 50, 50)
      );

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          outfit_name: "测试装",
          outfit_type: "casual",
          generate_image: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe("QUOTA_EXCEEDED");
    });
  });

  describe("认证失败", () => {
    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          outfit_name: "测试装",
          outfit_type: "casual",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });
  });

  describe("错误处理", () => {
    it("应该处理 LLM 简化失败", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });
      const mockOutfit = createMockOutfit({ character_id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (ensureLlmProvider as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (callChatCompletionByType as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("LLM failed")
      );
      (prisma.characterOutfit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.characterOutfit.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockOutfit);

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          outfit_name: "测试装",
          outfit_type: "casual",
          description: "详细描述",
          generate_image: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(prisma.characterOutfit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prompt_modifier: "详细描述",
        }),
      });
    });

    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost/api/character/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: "char-123",
          outfit_name: "测试装",
          outfit_type: "casual",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
