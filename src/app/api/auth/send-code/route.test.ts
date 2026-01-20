/**
 * POST /api/auth/send-code 端点测试
 *
 * 测试发送邮箱验证码功能
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../send-code/route";
import { createMockEmailVerification, createMockUser, createMockRateLimit } from "../test-helpers";

// Mock 模块
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  hashText: vi.fn(),
}));

vi.mock("@/lib/mailer", () => ({
  sendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkAndIncrementWindowLimitDistributed: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { hashText } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mailer";
import { checkAndIncrementWindowLimitDistributed } from "@/lib/rate-limit";

describe("POST /api/auth/send-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockRateLimit(true)
    );
  });

  describe("成功发送验证码", () => {
    it("应该成功发送验证码并返回成功消息", async () => {
      (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (hashText as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-code");
      (sendVerificationEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const mockTx = {
        emailVerification: {
          deleteMany: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue(createMockEmailVerification()),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback(mockTx)
      );

      const request = new Request("http://localhost/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("验证码已发送");

      expect(sendVerificationEmail).toHaveBeenCalledWith("test@example.com", expect.any(String));
    });

    it("应该删除旧的验证码记录", async () => {
      (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (hashText as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-code");
      (sendVerificationEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const mockDeleteMany = vi.fn().mockResolvedValue({});
      const mockTx = {
        emailVerification: {
          deleteMany: mockDeleteMany,
          create: vi.fn().mockResolvedValue(createMockEmailVerification()),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback(mockTx)
      );

      const request = new Request("http://localhost/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      await POST(request as never);

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("应该生成6位数字验证码", async () => {
      (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (hashText as ReturnType<typeof vi.fn>).mockResolvedValue("hashed-code");

      let capturedCode: string = "";
      (sendVerificationEmail as ReturnType<typeof vi.fn>).mockImplementation((email, code) => {
        capturedCode = code;
        return Promise.resolve();
      });

      const mockTx = {
        emailVerification: {
          deleteMany: vi.fn(),
          create: vi.fn().mockResolvedValue(createMockEmailVerification()),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback(mockTx)
      );

      const request = new Request("http://localhost/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      await POST(request as never);

      expect(capturedCode).toMatch(/^\d{6}$/);
    });
  });

  describe("验证失败场景", () => {
    it("应该拒绝无效的邮箱格式", async () => {
      const request = new Request("http://localhost/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid-email",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain("邮箱");
    });

    it("应该拒绝已注册并验证的邮箱", async () => {
      const verifiedUser = createMockUser({ verified: true });

      (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(verifiedUser);

      const request = new Request("http://localhost/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({
          email: "verified@example.com",
        }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain("已注册");
    });
  });

  describe("速率限制", () => {
    it("应该执行邮箱维度的速率限制", async () => {
      (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(createMockRateLimit(false))
        .mockResolvedValue(createMockRateLimit(true));

      const request = new Request("http://localhost/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.message).toContain("频繁");

      expect(checkAndIncrementWindowLimitDistributed).toHaveBeenCalledWith(
        "email:test@example.com",
        3,
        30 * 60 * 1000
      );
    });

    it("应该执行 IP 维度的速率限制", async () => {
      (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(createMockRateLimit(true))
        .mockResolvedValueOnce(createMockRateLimit(false));

      const request = new Request("http://localhost/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
    });
  });

  describe("错误处理", () => {
    it("应该处理邮件发送失败", async () => {
      (prisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (hashText as ReturnType<typeof vi.fn>).mockResolvedValue("hashed");
      (sendVerificationEmail as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("SMTP error")
      );

      const mockTx = {
        emailVerification: {
          deleteMany: vi.fn(),
          create: vi.fn().mockResolvedValue(createMockEmailVerification()),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation((callback) =>
        callback(mockTx)
      );

      const request = new Request("http://localhost/api/auth/send-code", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toContain("发送验证码失败");
    });
  });
});
