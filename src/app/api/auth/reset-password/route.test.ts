/**
 * POST /api/auth/reset-password 端点测试
 *
 * 直接调用路由处理函数，Redis 与限流使用 mock。
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { POST as requestReset } from "./route";
import { POST as requestCode } from "../forgot-password/route";
import { createMockRateLimit } from "../test-helpers";

interface RedisEntry {
  value: string;
  expiresAt: number | null;
}

interface RedisTestDouble {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode?: string, ttlSeconds?: number) => Promise<string>;
  del: (...keys: string[]) => Promise<number>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
  expireAll: () => void;
  clear: () => void;
}

function createRedisDouble(): RedisTestDouble {
  const store = new Map<string, RedisEntry>();

  const read = (key: string): string | null => {
    const entry = store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  };

  return {
    get: vi.fn(async (key: string) => read(key)),
    set: vi.fn(async (key: string, value: string, mode?: string, ttlSeconds?: number) => {
      const expiresAt =
        mode === "EX" && typeof ttlSeconds === "number" ? Date.now() + ttlSeconds * 1000 : null;
      store.set(key, { value, expiresAt });
      return "OK";
    }),
    del: vi.fn(async (...keys: string[]) => {
      let removed = 0;
      for (const key of keys) {
        if (store.delete(key)) {
          removed += 1;
        }
      }
      return removed;
    }),
    incr: vi.fn(async (key: string) => {
      const current = Number(read(key) ?? "0");
      const next = current + 1;
      const existing = store.get(key);
      store.set(key, { value: String(next), expiresAt: existing?.expiresAt ?? null });
      return next;
    }),
    expire: vi.fn(async (key: string, seconds: number) => {
      const entry = store.get(key);
      if (!entry) {
        return 0;
      }
      entry.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }),
    expireAll: () => {
      const expiredAt = Date.now() - 1000;
      for (const entry of store.values()) {
        entry.expiresAt = expiredAt;
      }
    },
    clear: () => {
      store.clear();
    },
  };
}

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/redis", () => ({
  redis: createRedisDouble(),
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
const INVALID_CODE_BODY = { error: "验证码无效或已过期" };

function asRedisDouble(client: object): RedisTestDouble {
  if (!("expireAll" in client) || !("clear" in client)) {
    throw new Error("Redis mock 缺少测试辅助方法");
  }
  return client as RedisTestDouble;
}

async function postReset(email: string, code: string, newPassword = "newpass1") {
  const request = new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "x-forwarded-for": "198.51.100.7" },
    body: JSON.stringify({ email, code, newPassword }),
  });
  const response = await requestReset(request as never);
  const body: unknown = await response.json();
  return { status: response.status, body };
}

async function issueCode(email: string): Promise<string> {
  let captured = "";
  (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
  (sendPasswordResetEmail as ReturnType<typeof vi.fn>).mockImplementation(
    async (_to: string, code: string) => {
      captured = code;
    },
  );

  const request = new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.20" },
    body: JSON.stringify({ email }),
  });
  const response = await requestCode(request as never);
  expect(response.status).toBe(200);
  expect(captured).toMatch(/^\d{6}$/);
  return captured;
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    asRedisDouble(redis).clear();
    vi.clearAllMocks();
    (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockRateLimit(true),
    );
  });

  describe("速率限制", () => {
    it("同一来源地址提交重置超出窗口限制返回 429", async () => {
      (checkAndIncrementWindowLimitDistributed as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockRateLimit(false),
      );

      const request = new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1" },
        body: JSON.stringify({
          email: "test@example.com",
          code: "123456",
          newPassword: "newpass1",
        }),
      });

      const response = await requestReset(request as never);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data).toEqual({ error: "请求过于频繁，请稍后再试" });
      expect(checkAndIncrementWindowLimitDistributed).toHaveBeenCalledWith(
        "reset-password:ip:198.51.100.7",
        20,
        10 * 60 * 1000,
        NO_MEMORY_FALLBACK,
      );
    });
  });

  describe("验证码校验", () => {
    it("验证码不存在、过期、错误三种情况的响应一致", async () => {
      const missing = await postReset("test@example.com", "123456");

      const issued = await issueCode("test@example.com");
      asRedisDouble(redis).expireAll();
      const expired = await postReset("test@example.com", issued);

      const active = await issueCode("test@example.com");
      const wrongCode = active === "000000" ? "111111" : "000000";
      const wrong = await postReset("test@example.com", wrongCode);

      expect(missing).toEqual({ status: 400, body: INVALID_CODE_BODY });
      expect(expired).toEqual(missing);
      expect(wrong).toEqual(missing);
    });

    it("连续 5 次错误后验证码作废，第 6 次即使提交正确验证码也返回 429", async () => {
      const issued = await issueCode("person@example.com");
      const wrongCode = issued === "000000" ? "111111" : "000000";

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const failed = await postReset("person@example.com", wrongCode);
        expect(failed).toEqual({ status: 400, body: INVALID_CODE_BODY });
      }

      const sixth = await postReset("person@example.com", issued);
      expect(sixth.status).toBe(429);
      expect(sixth.body).toEqual({ error: "验证码已失效，请重新获取验证码" });
    });

    it("重新申请验证码后可以再次尝试并成功重置", async () => {
      const first = await issueCode("again@example.com");
      const wrongCode = first === "000000" ? "111111" : "000000";

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const failed = await postReset("again@example.com", wrongCode);
        expect(failed).toEqual({ status: 400, body: INVALID_CODE_BODY });
      }

      const blocked = await postReset("again@example.com", first);
      expect(blocked.status).toBe(429);

      const second = await issueCode("again@example.com");
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
      const reset = await postReset("again@example.com", second, "freshpass");

      expect(reset).toEqual({ status: 200, body: { success: true } });
    });

    it("正确验证码重置成功后清除验证码和尝试计数，且不能再次使用", async () => {
      const issued = await issueCode("done@example.com");
      const wrongCode = issued === "000000" ? "111111" : "000000";

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const failed = await postReset("done@example.com", wrongCode);
        expect(failed).toEqual({ status: 400, body: INVALID_CODE_BODY });
      }

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
      const reset = await postReset("done@example.com", issued, "freshpass");
      expect(reset).toEqual({ status: 200, body: { success: true } });

      const reused = await postReset("done@example.com", issued, "freshpass");
      expect(reused).toEqual({ status: 400, body: INVALID_CODE_BODY });

      expect(await asRedisDouble(redis).get("password-reset:done@example.com")).toBeNull();
      expect(await asRedisDouble(redis).get("password-reset-attempts:done@example.com")).toBeNull();
      expect(await asRedisDouble(redis).get("password-reset-voided:done@example.com")).toBeNull();

      const updateCall = (prisma.user.update as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as {
        data: { password_hash: string };
      };
      expect(updateCall.data.password_hash).not.toBe("freshpass");
      expect(await bcrypt.compare("freshpass", updateCall.data.password_hash)).toBe(true);
    });

    it("密码少于 6 位时仍返回原有文案，且不消耗验证码", async () => {
      const issued = await issueCode("short@example.com");
      const tooShort = await postReset("short@example.com", issued, "12345");
      expect(tooShort).toEqual({ status: 400, body: { error: "密码至少 6 位" } });

      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
      const reset = await postReset("short@example.com", issued, "123456");
      expect(reset).toEqual({ status: 200, body: { success: true } });
    });

    it("邮箱大小写不同仍可以使用已发送的验证码重置", async () => {
      const issued = await issueCode("User@Example.com");
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "user-1" });
      const reset = await postReset("user@example.com", issued, "freshpass");
      expect(reset).toEqual({ status: 200, body: { success: true } });
    });

    it("未注册邮箱的申请不会解除已作废验证码", async () => {
      const issued = await issueCode("victim@example.com");
      const wrongCode = issued === "000000" ? "111111" : "000000";

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const failed = await postReset("victim@example.com", wrongCode);
        expect(failed).toEqual({ status: 400, body: INVALID_CODE_BODY });
      }

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
        async ({ where }: { where: { email: string } }) => {
          if (where.email === "victim@example.com") {
            return { id: "user-1" };
          }
          return null;
        },
      );

      const request = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.40" },
        body: JSON.stringify({ email: "stranger@example.com" }),
      });
      const response = await requestCode(request as never);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });

      const sixth = await postReset("victim@example.com", issued);
      expect(sixth.status).toBe(429);
      expect(sixth.body).toEqual({ error: "验证码已失效，请重新获取验证码" });
    });
  });
});
