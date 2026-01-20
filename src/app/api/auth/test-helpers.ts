/**
 * 认证测试共享工具和类型定义
 *
 * 提供测试 Mock、工具函数和类型定义
 */

import { vi } from "vitest";
import type { User } from "@prisma/client";

// 测试用户数据类型
export type TestUser = Pick<
  User,
  "id" | "email" | "password_hash" | "name" | "verified" | "role" | "status" | "credits"
>;

// 测试用邮箱验证记录类型
export type TestEmailVerification = {
  id: string;
  email: string;
  code_hash: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
};

// Mock 用户数据生成器
export const createMockUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: "user-test-id-123",
  email: "test@example.com",
  password_hash: "$2a$10$hashedpassword123456789",
  name: "测试用户",
  verified: true,
  role: "user",
  status: "active",
  credits: 1000,
  ...overrides,
});

// Mock JWT token 生成器
export const createMockToken = () => "mock-jwt-token-12345";

// Mock cookies 工具
export const createMockCookies = () => {
  const mockCookiesGet = vi.fn();
  const mockCookiesSet = vi.fn();
  const mockCookies = vi.fn().mockResolvedValue({
    get: mockCookiesGet,
    set: mockCookiesSet,
  });

  return { mockCookies, mockCookiesGet, mockCookiesSet };
};

// Mock NextResponse cookies 方法
export const createMockResponseCookies = () => {
  const mockSet = vi.fn();
  return { set: mockSet };
};

// Mock 邮箱验证码记录生成器
export const createMockEmailVerification = (
  overrides: Partial<TestEmailVerification> = {}
): TestEmailVerification => ({
  id: "verification-test-id-123",
  email: "test@example.com",
  code_hash: "$2a$10$hashedcode123456789",
  expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10分钟后过期
  used: false,
  created_at: new Date(),
  ...overrides,
});

// Mock Request 构建器
export const createMockRequest = (options: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  ip?: string;
}) => {
  const {
    method = "POST",
    url = "http://localhost/api/auth/test",
    body = {},
    headers = { "Content-Type": "application/json" },
    ip = "127.0.0.1",
  } = options;

  return new Request(url, {
    method,
    headers,
    body: method === "POST" || method === "PUT" ? JSON.stringify(body) : undefined,
  }) as Request & { ip?: string };
};

// Prisma Transaction Mock 辅助函数
export const createMockTransaction = (mockFunctions: Record<string, unknown>) => {
  return vi.fn().mockImplementation((callback) => callback(mockFunctions));
};

// Rate Limit Mock 辅助函数
export const createMockRateLimit = (allowed: boolean = true) => ({
  allowed,
  remaining: allowed ? 5 : 0,
  resetAt: Date.now() + 60000,
});
