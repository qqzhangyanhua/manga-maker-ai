/**
 * GET/POST /api/character 端点测试
 *
 * 测试角色列表获取和创建功能
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "./route";
import {
  createMockCharacterWithRelations,
  createMockCookies,
  createMockAuthPayload,
  createMockComicStyle,
} from "./test-helpers";

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
      findMany: vi.fn(),
      create: vi.fn(),
    },
    characterOutfit: {
      create: vi.fn(),
    },
    comicStyle: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/upload-helpers", () => ({
  uploadImageToMinio: vi.fn(),
  validateImageFile: vi.fn(),
}));

import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

describe("GET /api/character", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("成功获取角色列表", () => {
    it("应该返回当前用户的所有角色", async () => {
      const mockCharacters = [
        createMockCharacterWithRelations({ name: "角色1" }),
        createMockCharacterWithRelations({ name: "角色2", id: "char-2" }),
      ];

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacters);

      const request = new Request("http://localhost/api/character");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.characters).toHaveLength(2);
      expect(data.characters[0].name).toBe("角色1");
      expect(data.characters[1].name).toBe("角色2");
    });

    it("应该只返回当前用户的角色", async () => {
      const userId = "user-specific-123";
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(
        createMockAuthPayload(userId)
      );
      (prisma.character.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const request = new Request("http://localhost/api/character");
      await GET(request);

      expect(prisma.character.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          user_id: userId,
        }),
        include: expect.any(Object),
        orderBy: { created_at: "desc" },
      });
    });

    it("应该支持按漫画风格过滤", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const styleId = "style-123";
      const request = new Request(`http://localhost/api/character?style_id=${styleId}`);
      await GET(request);

      expect(prisma.character.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          comic_style_id: styleId,
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it("应该支持过滤无风格的角色", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const request = new Request(`http://localhost/api/character?style_id=null`);
      await GET(request);

      expect(prisma.character.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          comic_style_id: null,
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it("应该包含关联的 views、expressions、outfits 数据", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const request = new Request("http://localhost/api/character");
      await GET(request);

      expect(prisma.character.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.objectContaining({
          views: true,
          expressions: true,
          outfits: true,
          comic_style: expect.any(Object),
        }),
        orderBy: expect.any(Object),
      });
    });
  });

  describe("认证失败场景", () => {
    it("应该拒绝未登录的请求", async () => {
      const mockCookiesGet = vi.fn().mockReturnValue(undefined);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("应该拒绝无效的 token", async () => {
      const mockCookiesGet = vi.fn().mockReturnValue({ value: "invalid-token" });
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const request = new Request("http://localhost/api/character");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("无效的token");
    });
  });

  describe("错误处理", () => {
    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost/api/character");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("获取角色列表失败");
    });
  });
});

describe("POST /api/character", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("成功创建角色 (JSON)", () => {
    it("应该成功创建角色并返回角色数据", async () => {
      const mockCharacter = createMockCharacterWithRelations({
        name: "新角色",
        description: "测试描述",
      });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (prisma.characterOutfit.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const request = new Request("http://localhost/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "新角色",
          description: "测试描述",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.character.name).toBe("新角色");
      expect(data.character.description).toBe("测试描述");
    });

    it("应该为新角色创建默认装", async () => {
      const mockCharacter = createMockCharacterWithRelations({ id: "new-char-123" });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);

      const mockCreateOutfit = vi.fn().mockResolvedValue({});
      (prisma.characterOutfit.create as ReturnType<typeof vi.fn>).mockImplementation(
        mockCreateOutfit
      );

      const request = new Request("http://localhost/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "测试角色" }),
      });

      await POST(request);

      expect(mockCreateOutfit).toHaveBeenCalledWith({
        data: expect.objectContaining({
          character_id: "new-char-123",
          outfit_name: "默认装",
          outfit_type: "default",
          is_default: true,
        }),
      });
    });

    it("应该验证并关联漫画风格", async () => {
      const styleId = "style-123";
      const mockStyle = createMockComicStyle({ id: styleId });
      const mockCharacter = createMockCharacterWithRelations({ comic_style_id: styleId });

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.comicStyle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockStyle);
      (prisma.character.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (prisma.characterOutfit.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const request = new Request("http://localhost/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "测试角色",
          comic_style_id: styleId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.character.comic_style_id).toBe(styleId);
    });

    it("应该正确处理 tags 数组", async () => {
      const mockCharacter = createMockCharacterWithRelations();

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCharacter);
      (prisma.characterOutfit.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const tags = ["标签1", "标签2", "标签3"];

      const request = new Request("http://localhost/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "测试角色",
          tags,
        }),
      });

      await POST(request);

      expect(prisma.character.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tags,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe("验证失败场景", () => {
    it("应该拒绝空角色名称", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const request = new Request("http://localhost/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("角色名称");
    });

    it("应该拒绝不存在的漫画风格", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.comicStyle.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request("http://localhost/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "测试角色",
          comic_style_id: "non-existent-style",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("漫画风格不存在");
    });
  });

  describe("认证失败场景", () => {
    it("应该拒绝未登录的请求", async () => {
      const mockCookiesGet = vi.fn().mockReturnValue(undefined);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "测试角色" }),
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

      const request = new Request("http://localhost/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "测试角色" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("无效的token");
    });
  });

  describe("错误处理", () => {
    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.character.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "测试角色" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
