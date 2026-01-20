/**
 * GET /api/auth/me 端点测试
 *
 * 测试获取当前登录用户信息功能
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../me/route";
import { createMockUser, createMockToken } from "../test-helpers";

// Mock 模块
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  readAuthCookie: vi.fn(),
  verifyAuthToken: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { readAuthCookie, verifyAuthToken } from "@/lib/auth";

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("成功获取用户信息", () => {
    it("应该返回当前登录用户的完整信息", async () => {
      const mockUser = createMockUser({ id: "user-123", email: "test@example.com" });
      const mockPayload = { userId: "user-123", email: "test@example.com", role: "user" };

      (readAuthCookie as ReturnType<typeof vi.fn>).mockReturnValue(createMockToken());
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(mockPayload);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const request = new Request("http://localhost/api/auth/me", {
        method: "GET",
      });

      const response = await GET(request as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.user.id).toBe("user-123");
      expect(data.data.user.email).toBe("test@example.com");
    });

    it("应该包含用户的积分信息", async () => {
      const mockUser = createMockUser({ credits: 5000, total_credits_used: 2000 });
      const mockPayload = { userId: "user-123", email: "test@example.com", role: "user" };

      (readAuthCookie as ReturnType<typeof vi.fn>).mockReturnValue(createMockToken());
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(mockPayload);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const request = new Request("http://localhost/api/auth/me", { method: "GET" });

      const response = await GET(request as never);
      const data = await response.json();

      expect(data.data.user.credits).toBe(5000);
      expect(data.data.user.total_credits_used).toBe(2000);
    });
  });

  describe("认证失败场景", () => {
    it("应该拒绝没有 cookie 的请求", async () => {
      (readAuthCookie as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const request = new Request("http://localhost/api/auth/me", { method: "GET" });

      const response = await GET(request as never);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("未登录");
    });

    it("应该拒绝无效的 token", async () => {
      (readAuthCookie as ReturnType<typeof vi.fn>).mockReturnValue("invalid-token");
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const request = new Request("http://localhost/api/auth/me", { method: "GET" });

      const response = await GET(request as never);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("登录状态已失效");
    });

    it("应该返回404当用户不存在", async () => {
      const mockPayload = { userId: "non-existent-id", email: "test@example.com", role: "user" };

      (readAuthCookie as ReturnType<typeof vi.fn>).mockReturnValue(createMockToken());
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(mockPayload);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request("http://localhost/api/auth/me", { method: "GET" });

      const response = await GET(request as never);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe("用户不存在");
    });
  });

  describe("错误处理", () => {
    it("应该处理数据库错误", async () => {
      const mockPayload = { userId: "user-123", email: "test@example.com", role: "user" };

      (readAuthCookie as ReturnType<typeof vi.fn>).mockReturnValue(createMockToken());
      (verifyAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(mockPayload);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost/api/auth/me", { method: "GET" });

      const response = await GET(request as never);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("获取用户信息失败");
    });
  });
});
