/**
 * POST /api/character/[id]/generate-image 端点测试
 *
 * 测试角色图片生成功能
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import {
  createMockCharacterWithRelations,
  createMockCookies,
  createMockAuthPayload,
  createMockComicStyle,
} from "../../test-helpers";

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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    comicStyle: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/image-generation", () => ({
  callImageGenerationByType: vi.fn(),
}));

vi.mock("@/lib/minio", () => ({
  minioClient: {
    putObject: vi.fn(),
  },
  MINIO_BUCKET: "test-bucket",
  ensureBucketExists: vi.fn(),
  getPublicUrl: vi.fn((objectName: string) => `https://minio.example.com/${objectName}`),
}));

import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { minioClient, ensureBucketExists, getPublicUrl } from "@/lib/minio";

describe("POST /api/character/[id]/generate-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("成功生成图片", () => {
    it("应该成功生成角色图片并更新数据库", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        user_id: "user-test-id-456",
        base_image_url: null,
        reference_image: null,
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        images: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="],
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.character.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockCharacter,
        base_image_url: "https://minio.example.com/users/user-test-id-456/characters/char-123/base.png",
      });

      const request = new Request(`http://localhost/api/character/${characterId}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.image_base64).toBeDefined();
      expect(callImageGenerationByType).toHaveBeenCalled();
      expect(minioClient.putObject).toHaveBeenCalled();
      expect(prisma.character.update).toHaveBeenCalled();
    });

    it("应该使用漫画风格的 prompt_prefix", async () => {
      const characterId = "char-123";
      const styleId = "style-456";
      const mockStyle = createMockComicStyle({ id: styleId, prompt_prefix: "anime style, " });
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        comic_style_id: styleId,
        base_prompt: "a girl",
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (prisma.comicStyle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockStyle);
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        images: ["data:image/png;base64,test"],
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.character.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);

      const request = new Request(`http://localhost/api/character/${characterId}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });

      expect(response.status).toBe(200);
      expect(callImageGenerationByType).toHaveBeenCalled();
      const imageGenCall = (callImageGenerationByType as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(imageGenCall.prompt).toContain("anime style");
    });

    it("应该同时更新 base_image_url 和 reference_image", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        base_image_url: null,
        reference_image: null,
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        images: ["data:image/png;base64,test"],
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.character.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);

      const request = new Request(`http://localhost/api/character/${characterId}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });

      expect(response.status).toBe(200);
      expect(prisma.character.update).toHaveBeenCalled();
      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: characterId },
        data: expect.objectContaining({
          base_image_url: expect.any(String),
          reference_image: expect.any(String),
        }),
      });
    });
  });

  describe("认证失败", () => {
    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character/char-123/generate-image", {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: "char-123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("应该拒绝无效的 token", async () => {
      const mockCookiesGet = vi.fn().mockReturnValue({ value: "invalid-token" });
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const request = new Request("http://localhost/api/character/char-123/generate-image", {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: "char-123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("无效的token");
    });
  });

  describe("权限验证", () => {
    it("应该返回404当角色不存在", async () => {
      const characterId = "non-existent";

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request(`http://localhost/api/character/${characterId}/generate-image`, {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("角色不存在");
    });

    it("应该返回403当用户无权访问角色", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        user_id: "other-user-id",
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockAuthPayload("user-test-id-456")
      );
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);

      const request = new Request(`http://localhost/api/character/${characterId}/generate-image`, {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("无权访问此角色");
    });
  });

  describe("图片生成失败处理", () => {
    it("应该处理图片生成服务失败", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Image generation service unavailable",
      });

      const request = new Request(`http://localhost/api/character/${characterId}/generate-image`, {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("应该处理配额超限错误", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);

      const quotaError = new Error("超出每日配额") as Error & { code: string };
      quotaError.code = "QUOTA_EXCEEDED";
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockRejectedValue(quotaError);

      const request = new Request(`http://localhost/api/character/${characterId}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe("QUOTA_EXCEEDED");
    });
  });

  describe("MinIO 上传失败处理", () => {
    it("应该在上传失败时返回错误", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        images: ["data:image/png;base64,test"],
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("MinIO connection failed")
      );

      const request = new Request(`http://localhost/api/character/${characterId}/generate-image`, {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe("错误处理", () => {
    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database connection error")
      );

      const request = new Request("http://localhost/api/character/char-123/generate-image", {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ id: "char-123" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
