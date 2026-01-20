/**
 * POST /api/auth/logout 端点测试
 *
 * 测试用户登出功能
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../logout/route";

// Mock 模块
vi.mock("@/lib/auth", () => ({
  clearAuthCookie: vi.fn(),
}));

import { clearAuthCookie } from "@/lib/auth";

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("成功登出", () => {
    it("应该成功登出并清除 cookie", async () => {
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("已退出登录");

      expect(clearAuthCookie).toHaveBeenCalledWith(expect.anything());
    });

    it("应该调用 clearAuthCookie 清除认证 cookie", async () => {
      await POST();

      expect(clearAuthCookie).toHaveBeenCalledTimes(1);
      expect(clearAuthCookie).toHaveBeenCalledWith(expect.objectContaining({
        json: expect.any(Function),
        cookies: expect.any(Object),
      }));
    });

    it("应该始终返回成功响应", async () => {
      for (let i = 0; i < 3; i++) {
        const response = await POST();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });
  });

  describe("幂等性", () => {
    it("应该允许重复登出", async () => {
      const response1 = await POST();
      const data1 = await response1.json();

      const response2 = await POST();
      const data2 = await response2.json();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(data1.success).toBe(true);
      expect(data2.success).toBe(true);
    });
  });
});
