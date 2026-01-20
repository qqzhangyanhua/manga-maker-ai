/**
 * /api/character/outfits/[id]/generate 端点测试
 *
 * 测试服装图片生成功能（POST）
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import {
  createMockCookies,
  createMockAuthPayload,
} from "../../../test-helpers";

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
    characterOutfit: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/outfit-generation", () => ({
  generateOutfitAsync: vi.fn(),
}));

vi.mock("@/lib/generation-log", () => ({
  recordGenerationLog: vi.fn(),
}));

import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateOutfitAsync } from "@/lib/outfit-generation";
import { recordGenerationLog } from "@/lib/generation-log";

describe("/api/character/outfits/[id]/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("POST /api/character/outfits/[id]/generate", () => {
    it("应该成功生成服装图片（异步模式）", async () => {
      const mockOutfit = {
        id: "outfit-123",
        character_id: "char-123",
        outfit_type: "casual",
        prompt_modifier: null,
        image_url: null,
        character: {
          id: "char-123",
          user_id: "user-test-id-456",
          name: "测试角色",
          description: "A test character",
          base_image_url: "https://example.com/char-base.png",
        },
      };

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterOutfit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOutfit
      );
      (generateOutfitAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
        taskId: "task-123",
        imageUrl: undefined,
      });
      (recordGenerationLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/outfits/outfit-123/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wait: false }),
      });

      const response = await POST(request, { params: { id: "outfit-123" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.task_id).toBe("task-123");
      expect(data.image_url).toBeUndefined();
      expect(data.message).toBe("服装图片生成任务已提交");

      expect(generateOutfitAsync).toHaveBeenCalledWith(
        "A test character",
        "casual",
        "user-test-id-456",
        undefined,
        false,
        "https://example.com/char-base.png"
      );

      expect(recordGenerationLog).toHaveBeenCalledWith({
        userId: "user-test-id-456",
        action: "outfit_generation",
        providerType: "image_generation",
        status: "pending",
        durationMs: expect.any(Number),
        requestPayload: { outfit_id: "outfit-123" },
        responsePayload: { task_id: "task-123" },
      });
    });

    it("应该成功生成服装图片（同步模式）", async () => {
      const mockOutfit = {
        id: "outfit-123",
        character_id: "char-123",
        outfit_type: "formal",
        prompt_modifier: "elegant suit",
        image_url: null,
        character: {
          id: "char-123",
          user_id: "user-test-id-456",
          name: "测试角色",
          description: "A test character",
          base_image_url: "https://example.com/char-base.png",
        },
      };

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterOutfit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOutfit
      );
      (generateOutfitAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
        taskId: "task-456",
        imageUrl: "https://example.com/outfit-formal.png",
      });
      (prisma.characterOutfit.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockOutfit,
        image_url: "https://example.com/outfit-formal.png",
      });
      (recordGenerationLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/outfits/outfit-123/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wait: true }),
      });

      const response = await POST(request, { params: { id: "outfit-123" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.task_id).toBe("task-456");
      expect(data.image_url).toBe("https://example.com/outfit-formal.png");
      expect(data.message).toBe("服装图片生成完成");

      expect(generateOutfitAsync).toHaveBeenCalledWith(
        "A test character",
        "formal",
        "user-test-id-456",
        "elegant suit",
        true,
        "https://example.com/char-base.png"
      );

      expect(prisma.characterOutfit.update).toHaveBeenCalledWith({
        where: { id: "outfit-123" },
        data: { image_url: "https://example.com/outfit-formal.png" },
      });

      expect(recordGenerationLog).toHaveBeenCalledWith({
        userId: "user-test-id-456",
        action: "outfit_generation",
        providerType: "image_generation",
        status: "success",
        durationMs: expect.any(Number),
        requestPayload: { outfit_id: "outfit-123" },
        responsePayload: { task_id: "task-456" },
      });
    });

    it("应该使用角色名称当描述为空时", async () => {
      const mockOutfit = {
        id: "outfit-123",
        character_id: "char-123",
        outfit_type: "school",
        prompt_modifier: null,
        image_url: null,
        character: {
          id: "char-123",
          user_id: "user-test-id-456",
          name: "学生角色",
          description: null,
          base_image_url: null,
        },
      };

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterOutfit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOutfit
      );
      (generateOutfitAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
        taskId: "task-789",
        imageUrl: undefined,
      });
      (recordGenerationLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/outfits/outfit-123/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: "outfit-123" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(generateOutfitAsync).toHaveBeenCalledWith(
        "学生角色",
        "school",
        "user-test-id-456",
        undefined,
        false,
        undefined
      );
    });

    it("应该返回 404 当服装不存在", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterOutfit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request(
        "http://localhost/api/character/outfits/non-existent/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request, { params: { id: "non-existent" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("服装不存在");
    });

    it("应该返回 403 当用户无权访问服装", async () => {
      const mockOutfit = {
        id: "outfit-123",
        character_id: "char-123",
        outfit_type: "casual",
        prompt_modifier: null,
        image_url: null,
        character: {
          id: "char-123",
          user_id: "other-user-id",
          name: "其他用户角色",
          description: "Not my character",
          base_image_url: null,
        },
      };

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterOutfit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOutfit
      );

      const request = new Request("http://localhost/api/character/outfits/outfit-123/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: "outfit-123" } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("无权限");
    });

    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character/outfits/outfit-123/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: "outfit-123" } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("应该拒绝无效的 token", async () => {
      const mockCookiesGet = vi.fn().mockReturnValue({ value: "invalid-token" });
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const request = new Request("http://localhost/api/character/outfits/outfit-123/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: "outfit-123" } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("无效的token");
    });

    it("应该处理生成失败错误", async () => {
      const mockOutfit = {
        id: "outfit-123",
        character_id: "char-123",
        outfit_type: "battle",
        prompt_modifier: null,
        image_url: null,
        character: {
          id: "char-123",
          user_id: "user-test-id-456",
          name: "战士",
          description: "A warrior character",
          base_image_url: null,
        },
      };

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterOutfit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOutfit
      );
      (generateOutfitAsync as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("图片生成服务失败")
      );
      (recordGenerationLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/outfits/outfit-123/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: "outfit-123" } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("图片生成服务失败");

      expect(recordGenerationLog).toHaveBeenCalledWith({
        userId: "user-test-id-456",
        action: "outfit_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: expect.any(Number),
        errorMessage: "图片生成服务失败",
      });
    });

    it("应该处理数据库查询错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterOutfit.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost/api/character/outfits/outfit-123/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: { id: "outfit-123" } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });

    it("应该处理数据库更新错误（同步模式）", async () => {
      const mockOutfit = {
        id: "outfit-123",
        character_id: "char-123",
        outfit_type: "sports",
        prompt_modifier: null,
        image_url: null,
        character: {
          id: "char-123",
          user_id: "user-test-id-456",
          name: "运动员",
          description: "An athlete",
          base_image_url: null,
        },
      };

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterOutfit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockOutfit
      );
      (generateOutfitAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
        taskId: "task-999",
        imageUrl: "https://example.com/outfit-sports.png",
      });
      (prisma.characterOutfit.update as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Update failed")
      );
      (recordGenerationLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/character/outfits/outfit-123/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wait: true }),
      });

      const response = await POST(request, { params: { id: "outfit-123" } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Update failed");

      expect(recordGenerationLog).toHaveBeenCalledWith({
        userId: "user-test-id-456",
        action: "outfit_generation",
        providerType: "image_generation",
        status: "failed",
        durationMs: expect.any(Number),
        errorMessage: "Update failed",
      });
    });
  });
});
