/**
 * POST /api/auth/forgot-password 端点测试
 *
 * 直接调用路由处理函数，Redis 与限流使用 mock。
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { createMockRateLimit } from "../test-helpers";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock("@/lib/mailer", () => ({
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkAndIncrementWindowLimitDistributed: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { checkAndIncrementWindowLimitDistributed } from "@/lib/rate-limit";

const NO_MEMORY_FALLBACK = { allowMemoryFallback: false };

async function postForgot(email: string) {
  const request = new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify({ email }),
  });
  const response = await POST(request as never);
  const body: unknown = await response.json();
  return { status: response.status, body };
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockRateLimit(true),
    );
  });

  describe("邮箱枚举", () => {
    it("已注册和未注册邮箱返回相同的状态码和响应体", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
        async ({ where }: { where: { email: string } }) => {
          if (where.email === "known@example.com") {
            return { id: "user-1" };
          }
          return null;
        },
      );
      (redis.set as ReturnType<typeof vi.fn>).mockResolvedValue("OK");
      (sendPasswordResetEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const known = await postForgot("known@example.com");
      const unknown = await postForgot("unknown@example.com");

      expect(known.status).toBe(unknown.status);
      expect(known.body).toEqual(unknown.body);
      expect(known).toEqual({ status: 200, body: { success: true } });
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it("被限流时已注册和未注册邮箱的响应仍然相同", async () => {
      (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockRateLimit(false),
      );
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
        async ({ where }: { where: { email: string } }) => {
          if (where.email === "known@example.com") {
            return { id: "user-1" };
          }
          return null;
        },
      );

      const known = await postForgot("known@example.com");
      const unknown = await postForgot("unknown@example.com");

      expect(known.status).toBe(429);
      expect(known).toEqual(unknown);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe("速率限制", () => {
    it("同一邮箱短时间内重复申请验证码返回 429", async () => {
      (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        createMockRateLimit(false),
      );

      const request = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ email: "Test@Example.com" }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data).toEqual({ error: "请求过于频繁，请稍后再试" });
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(checkAndIncrementWindowLimitDistributed).toHaveBeenCalledWith(
        "forgot-password:email:test@example.com",
        3,
        30 * 60 * 1000,
        NO_MEMORY_FALLBACK,
      );
    });

    it("同一来源地址短时间内重复申请验证码返回 429", async () => {
      (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(createMockRateLimit(true))
        .mockResolvedValueOnce(createMockRateLimit(false));

      const request = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.8" },
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await POST(request as never);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data).toEqual({ error: "操作过于频繁，请稍后再试" });
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(checkAndIncrementWindowLimitDistributed).toHaveBeenCalledWith(
        "forgot-password:ip:203.0.113.10",
        10,
        60 * 1000,
        NO_MEMORY_FALLBACK,
      );
    });
  });
});
