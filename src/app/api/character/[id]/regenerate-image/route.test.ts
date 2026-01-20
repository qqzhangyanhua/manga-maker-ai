/**
 * POST /api/character/[id]/regenerate-image 端点测试
 *
 * 测试角色图片重新生成功能
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import {
  createMockCharacterWithRelations,
  createMockCookies,
  createMockAuthPayload,
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
import { minioClient, ensureBucketExists } from "@/lib/minio";

describe("POST /api/character/[id]/regenerate-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("快速模式 (fast)", () => {
    it("应该使用原提示词重新生成图片", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        base_prompt: "a beautiful girl",
        description: "描述信息",
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

      const request = new Request(`http://localhost/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.image_base64).toBeDefined();

      const imageGenCall = (callImageGenerationByType as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(imageGenCall.prompt).toBe("a beautiful girl");
    });

    it("应该在没有 base_prompt 时使用 description", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        base_prompt: null,
        description: "一个美丽的女孩",
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

      const request = new Request(`http://localhost/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast" }),
      });

      await POST(request, { params: Promise.resolve({ id: characterId }) });

      const imageGenCall = (callImageGenerationByType as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(imageGenCall.prompt).toBe("一个美丽的女孩");
    });
  });

  describe("变化模式 (variation)", () => {
    it("应该在原提示词基础上添加变化描述", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({
        id: characterId,
        base_prompt: "a girl",
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

      const request = new Request(`http://localhost/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "variation",
          variation_prompt: "with red hair"
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.optimized_prompt).toContain("a girl");
      expect(data.optimized_prompt).toContain("with red hair");
    });

    it("应该拒绝缺少 variation_prompt 的请求", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);

      const request = new Request(`http://localhost/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "variation" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("variation_prompt");
    });
  });

  describe("图片更新选项", () => {
    it("应该在 update_base_image=true 时更新数据库", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        images: ["data:image/png;base64,test"],
      });
      (ensureBucketExists as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (minioClient.putObject as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (prisma.character.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);

      const request = new Request(`http://localhost/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "fast",
          update_base_image: true
        }),
      });

      await POST(request, { params: Promise.resolve({ id: characterId }) });

      expect(minioClient.putObject).toHaveBeenCalled();
      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: characterId },
        data: { base_image_url: expect.any(String) },
      });
    });

    it("应该在 update_base_image=false 时跳过数据库更新", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        images: ["data:image/png;base64,test"],
      });

      const request = new Request(`http://localhost/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "fast",
          update_base_image: false
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.image_base64).toBeDefined();
      expect(minioClient.putObject).not.toHaveBeenCalled();
      expect(prisma.character.update).not.toHaveBeenCalled();
    });
  });

  describe("认证失败", () => {
    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character/char-123/regenerate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "char-123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });
  });

  describe("权限验证", () => {
    it("应该返回404当角色不存在", async () => {
      const characterId = "non-existent";

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request(`http://localhost/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast" }),
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

      const request = new Request(`http://localhost/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("无权访问此角色");
    });
  });

  describe("错误处理", () => {
    it("应该处理配额不足错误", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);

      const quotaError = new Error("积分不足");
      (quotaError as Error & { code: string }).code = "INSUFFICIENT_CREDITS";
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockRejectedValue(quotaError);

      const request = new Request(`http://localhost/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("积分不足");
    });

    it("应该处理图片生成失败", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (callImageGenerationByType as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Service unavailable",
      });

      const request = new Request(`http://localhost/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("应该处理上传失败但继续返回结果", async () => {
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
        new Error("Upload failed")
      );

      const request = new Request(`http://localhost/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "fast", update_base_image: true }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.image_base64).toBeDefined();
    });
  });
});
