/**
 * POST /api/auth/login 端点测试
 *
 * 测试用户登录功能，包括：
 * - 成功登录
 * - 邮箱/密码验证
 * - 账号状态检查
 * - 速率限制
 * - Cookie 设置
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../login/route";
import { createMockUser, createMockToken, createMockRateLimit } from "../test-helpers";

// Mock 模块依赖
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
  initializeAdmin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth", () => ({
  verifyHash: vi.fn(),
  signAuthToken: vi.fn(),
  attachAuthCookie: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkAndIncrementWindowLimitDistributed: vi.fn(),
}));

// 导入 Mock 后的模块
import { prisma } from "@/lib/db";
import { verifyHash, signAuthToken, attachAuthCookie } from "@/lib/auth";
import { checkAndIncrementWindowLimitDistributed } from "@/lib/rate-limit";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认：速率限制允许
    (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockRateLimit(true)
    );
  });

  describe("成功登录场景", () => {
    it("应该成功登录并返回用户信息", async () => {
      const mockUser = createMockUser();

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (verifyHash as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (signAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockToken());

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("登录成功");
      expect(data.data.user.email).toBe("test@example.com");

      // 验证 Cookie 已设置
      expect(attachAuthCookie).toHaveBeenCalledWith(expect.anything(), createMockToken());
    });

    it("应该正确验证密码哈希", async () => {
      const mockUser = createMockUser();

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (verifyHash as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (signAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockToken());

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "correct-password",
        }),
      });

      await POST(request as never);

      expect(verifyHash).toHaveBeenCalledWith("correct-password", mockUser.password_hash);
    });

    it("应该生成包含正确字段的 JWT token", async () => {
      const mockUser = createMockUser({
        id: "user-123",
        email: "user@example.com",
        name: "John Doe",
        role: "admin",
      });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (verifyHash as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (signAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(createMockToken());

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      });

      await POST(request as never);

      expect(signAuthToken).toHaveBeenCalledWith({
        userId: "user-123",
        email: "user@example.com",
        name: "John Doe",
        role: "admin",
      });
    });
  });

  describe("验证失败场景", () => {
    it("应该拒绝无效的邮箱格式", async () => {
      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid-email",
          password: "password123",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain("邮箱");
    });

    it("应该拒绝过短的密码", async () => {
      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "short",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain("密码");
    });

    it("应该返回401当用户不存在", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("邮箱或密码错误");
    });

    it("应该返回401当密码不匹配", async () => {
      const mockUser = createMockUser();

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (verifyHash as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrong-password",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("邮箱或密码错误");
    });
  });

  describe("账号状态检查", () => {
    it("应该拒绝未验证邮箱的用户", async () => {
      const mockUser = createMockUser({ verified: false });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain("验证邮箱");
    });

    it("应该拒绝已封禁的用户", async () => {
      const mockUser = createMockUser({ status: "banned" });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("封禁");
    });

    it("应该拒绝已停用的用户", async () => {
      const mockUser = createMockUser({ status: "inactive" });

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("停用");
    });
  });

  describe("速率限制", () => {
    it("应该执行邮箱维度的速率限制", async () => {
      (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(createMockRateLimit(false))
        .mockResolvedValue(createMockRateLimit(true));

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.message).toContain("频繁");

      expect(checkAndIncrementWindowLimitDistributed).toHaveBeenCalledWith(
        "login:email:test@example.com",
        5,
        10 * 60 * 1000
      );
    });

    it("应该执行 IP 维度的速率限制", async () => {
      (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(createMockRateLimit(true))
        .mockResolvedValueOnce(createMockRateLimit(false));

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.message).toContain("频繁");
    });
  });

  describe("错误处理", () => {
    it("应该处理数据库错误", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("登录失败，请稍后再试");
    });

    it("应该处理无效的 JSON 格式", async () => {
      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
