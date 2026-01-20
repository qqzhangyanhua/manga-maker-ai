/**
 * GET/PATCH/DELETE /api/character/[id] 端点测试
 *
 * 测试单个角色的获取、更新和删除功能
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, PATCH, DELETE } from "./route";
import {
  createMockCharacterWithRelations,
  createMockCookies,
  createMockAuthPayload,
  createMockComicStyle,
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
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    comicStyle: {
      findUnique: vi.fn(),
    },
  },
}));

import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

describe("GET /api/character/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("成功获取角色", () => {
    it("应该返回指定角色的完整信息", async () => {
      const characterId = "char-123";
      const mockCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);

      const request = new Request(`http://localhost/api/character/${characterId}`);
      const response = await GET(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.character.id).toBe(characterId);
      expect(data.character.views).toBeDefined();
      expect(data.character.expressions).toBeDefined();
      expect(data.character.outfits).toBeDefined();
    });

    it("应该只返回当前用户拥有的角色", async () => {
      const userId = "user-specific-123";
      const characterId = "char-123";

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockAuthPayload(userId)
      );
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request(`http://localhost/api/character/${characterId}`);
      await GET(request, { params: Promise.resolve({ id: characterId }) });

      expect(prisma.character.findFirst).toHaveBeenCalledWith({
        where: {
          id: characterId,
          user_id: userId,
        },
        include: expect.any(Object),
      });
    });
  });

  describe("角色不存在", () => {
    it("应该返回404当角色不存在", async () => {
      const characterId = "non-existent-id";

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request(`http://localhost/api/character/${characterId}`);
      const response = await GET(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("角色不存在");
    });

    it("应该返回404当角色属于其他用户", async () => {
      const characterId = "char-123";

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockAuthPayload("other-user")
      );
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request(`http://localhost/api/character/${characterId}`);
      const response = await GET(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("角色不存在");
    });
  });

  describe("认证失败", () => {
    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character/char-123");
      const response = await GET(request, { params: Promise.resolve({ id: "char-123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });
  });

  describe("错误处理", () => {
    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost/api/character/char-123");
      const response = await GET(request, { params: Promise.resolve({ id: "char-123" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("获取角色失败");
    });
  });
});

describe("PATCH /api/character/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("成功更新角色", () => {
    it("应该成功更新角色名称", async () => {
      const characterId = "char-123";
      const updatedCharacter = createMockCharacterWithRelations({
        id: characterId,
        name: "新名称",
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        updatedCharacter
      );

      const request = new Request(`http://localhost/api/character/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "新名称" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.character.name).toBe("新名称");
    });

    it("应该支持部分更新", async () => {
      const characterId = "char-123";
      const updatedCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        updatedCharacter
      );

      const request = new Request(`http://localhost/api/character/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "新描述" }),
      });

      await PATCH(request, { params: Promise.resolve({ id: characterId }) });

      expect(prisma.character.updateMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        data: expect.objectContaining({
          description: "新描述",
          updated_at: expect.any(Date),
        }),
      });
    });

    it("应该验证漫画风格存在性", async () => {
      const characterId = "char-123";
      const styleId = "style-456";
      const mockStyle = createMockComicStyle({ id: styleId });
      const updatedCharacter = createMockCharacterWithRelations({ id: characterId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.comicStyle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockStyle);
      (prisma.character.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        updatedCharacter
      );

      const request = new Request(`http://localhost/api/character/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comic_style_id: styleId }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: characterId }) });

      expect(response.status).toBe(200);
      expect(prisma.comicStyle.findUnique).toHaveBeenCalledWith({
        where: { id: styleId },
      });
    });

    it("应该允许清除漫画风格 (设为null)", async () => {
      const characterId = "char-123";
      const updatedCharacter = createMockCharacterWithRelations({
        id: characterId,
        comic_style_id: null,
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      (prisma.character.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        updatedCharacter
      );

      const request = new Request(`http://localhost/api/character/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comic_style_id: null }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.character.comic_style_id).toBeNull();
    });
  });

  describe("验证失败", () => {
    it("应该拒绝不存在的漫画风格", async () => {
      const characterId = "char-123";

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.comicStyle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request(`http://localhost/api/character/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comic_style_id: "non-existent" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("漫画风格不存在");
    });

    it("应该返回404当角色不存在", async () => {
      const characterId = "char-123";

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

      const request = new Request(`http://localhost/api/character/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "新名称" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("角色不存在");
    });
  });

  describe("错误处理", () => {
    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.updateMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost/api/character/char-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "新名称" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "char-123" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("更新角色失败");
    });
  });
});

describe("DELETE /api/character/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("成功删除角色", () => {
    it("应该成功删除角色", async () => {
      const characterId = "char-123";

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

      const request = new Request(`http://localhost/api/character/${characterId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("应该只删除当前用户的角色", async () => {
      const characterId = "char-123";
      const userId = "user-specific-123";

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockAuthPayload(userId)
      );
      (prisma.character.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

      const request = new Request(`http://localhost/api/character/${characterId}`, {
        method: "DELETE",
      });

      await DELETE(request, { params: Promise.resolve({ id: characterId }) });

      expect(prisma.character.deleteMany).toHaveBeenCalledWith({
        where: {
          id: characterId,
          user_id: userId,
        },
      });
    });
  });

  describe("角色不存在", () => {
    it("应该返回404当角色不存在", async () => {
      const characterId = "non-existent";

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

      const request = new Request(`http://localhost/api/character/${characterId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: characterId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("角色不存在");
    });
  });

  describe("认证失败", () => {
    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character/char-123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "char-123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });
  });

  describe("错误处理", () => {
    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.deleteMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost/api/character/char-123", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "char-123" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("删除角色失败");
    });
  });
});
