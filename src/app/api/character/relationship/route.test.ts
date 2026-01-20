/**
 * /api/character/relationship 端点测试
 *
 * 测试角色关系图谱配置功能（GET, POST, DELETE）
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST, DELETE } from "./route";
import {
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
    characterRelationship: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

describe("/api/character/relationship", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：成功认证
    const mockCookiesGet = vi.fn().mockReturnValue({ value: "mock-jwt-token" });
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
    (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
  });

  describe("GET /api/character/relationship", () => {
    it("应该成功获取用户的角色关系配置", async () => {
      const mockRelationships = [
        {
          id: "rel-1",
          user_id: "user-test-id-456",
          character_id: "char-1",
          position_x: 100,
          position_y: 200,
          scale: 1.0,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
        },
        {
          id: "rel-2",
          user_id: "user-test-id-456",
          character_id: "char-2",
          position_x: 300,
          position_y: 400,
          scale: 1.5,
          created_at: new Date("2024-01-02"),
          updated_at: new Date("2024-01-02"),
        },
      ];

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterRelationship.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockRelationships
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.relationships).toHaveLength(2);
      expect(data.relationships[0]).toMatchObject({
        id: "rel-1",
        user_id: "user-test-id-456",
        character_id: "char-1",
        position_x: 100,
        position_y: 200,
        scale: 1.0,
      });
      expect(data.relationships[1]).toMatchObject({
        id: "rel-2",
        user_id: "user-test-id-456",
        character_id: "char-2",
        position_x: 300,
        position_y: 400,
        scale: 1.5,
      });
      expect(prisma.characterRelationship.findMany).toHaveBeenCalledWith({
        where: { user_id: "user-test-id-456" },
        orderBy: { created_at: "asc" },
      });
    });

    it("应该返回空数组当用户没有关系配置", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterRelationship.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.relationships).toEqual([]);
    });

    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("应该拒绝无效的 token", async () => {
      const mockCookiesGet = vi.fn().mockReturnValue({ value: "invalid-token" });
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("无效的token");
    });

    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterRelationship.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("服务器错误");
    });
  });

  describe("POST /api/character/relationship", () => {
    it("应该成功批量保存关系配置", async () => {
      const relationships = [
        {
          character_id: "char-1",
          position_x: 100,
          position_y: 200,
          scale: 1.0,
        },
        {
          character_id: "char-2",
          position_x: 300,
          position_y: 400,
          scale: 1.5,
        },
      ];

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterRelationship.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "rel-1",
        user_id: "user-test-id-456",
        character_id: "char-1",
        position_x: 100,
        position_y: 200,
        scale: 1.0,
        created_at: new Date(),
        updated_at: new Date(),
      });
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const request = new Request("http://localhost/api/character/relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationships }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("关系图谱已保存");
      expect(data.count).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("应该使用 upsert 更新已存在的关系配置", async () => {
      const relationships = [
        {
          character_id: "char-1",
          position_x: 150,
          position_y: 250,
          scale: 1.2,
        },
      ];

      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterRelationship.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "rel-1",
        user_id: "user-test-id-456",
        character_id: "char-1",
        position_x: 150,
        position_y: 250,
        scale: 1.2,
        created_at: new Date("2024-01-01"),
        updated_at: new Date(),
      });
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const request = new Request("http://localhost/api/character/relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationships }),
      });

      await POST(request);

      expect(prisma.characterRelationship.upsert).toHaveBeenCalledWith({
        where: {
          user_id_character_id: {
            user_id: "user-test-id-456",
            character_id: "char-1",
          },
        },
        update: {
          position_x: 150,
          position_y: 250,
          scale: 1.2,
          updated_at: expect.any(Date),
        },
        create: {
          user_id: "user-test-id-456",
          character_id: "char-1",
          position_x: 150,
          position_y: 250,
          scale: 1.2,
        },
      });
    });

    it("应该拒绝非数组的 relationships", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const request = new Request("http://localhost/api/character/relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationships: "not-an-array" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("relationships 必须是数组");
    });

    it("应该成功处理空数组", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const request = new Request("http://localhost/api/character/relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationships: [] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.count).toBe(0);
    });

    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request("http://localhost/api/character/relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relationships: [{ character_id: "char-1", position_x: 0, position_y: 0, scale: 1 }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Transaction failed")
      );

      const request = new Request("http://localhost/api/character/relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relationships: [{ character_id: "char-1", position_x: 0, position_y: 0, scale: 1 }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("服务器错误");
    });
  });

  describe("DELETE /api/character/relationship", () => {
    it("应该成功删除指定角色的关系配置", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterRelationship.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 1,
      });

      const request = new Request(
        "http://localhost/api/character/relationship?character_id=char-123",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("关系配置已删除");
      expect(prisma.characterRelationship.deleteMany).toHaveBeenCalledWith({
        where: {
          user_id: "user-test-id-456",
          character_id: "char-123",
        },
      });
    });

    it("应该拒绝缺少 character_id 的请求", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());

      const request = new Request("http://localhost/api/character/relationship", {
        method: "DELETE",
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("缺少 character_id 参数");
    });

    it("应该成功处理不存在的关系配置", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterRelationship.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 0,
      });

      const request = new Request(
        "http://localhost/api/character/relationship?character_id=non-existent",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("应该拒绝未登录的请求", async () => {
      const { mockCookiesGet } = createMockCookies(false);
      (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: mockCookiesGet });

      const request = new Request(
        "http://localhost/api/character/relationship?character_id=char-123",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("未登录");
    });

    it("应该处理数据库错误", async () => {
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockAuthPayload());
      (prisma.characterRelationship.deleteMany as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request(
        "http://localhost/api/character/relationship?character_id=char-123",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("服务器错误");
    });
  });
});
