/**
 * Auth API Schemas - Zod 定义
 * 用于生成 OpenAPI 文档和运行时验证
 */
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

// 扩展 Zod 以支持 OpenAPI
extendZodWithOpenApi(z);

// ============ Request Schemas ============

export const RegisterRequestSchema = z.object({
  email: z.string().email().openapi({
    description: "用户邮箱地址",
    example: "user@example.com"
  }),
  password: z.string().min(6).max(100).openapi({
    description: "用户密码（至少 6 位）",
    example: "password123"
  }),
  username: z.string().min(2).max(50).optional().openapi({
    description: "用户名（可选）",
    example: "张三"
  })
});

export const LoginRequestSchema = z.object({
  email: z.string().email().openapi({
    description: "用户邮箱",
    example: "user@example.com"
  }),
  password: z.string().min(6).openapi({
    description: "用户密码",
    example: "password123"
  })
});

export const SendVerificationCodeRequestSchema = z.object({
  email: z.string().email().openapi({
    description: "接收验证码的邮箱地址",
    example: "user@example.com"
  }),
  type: z.enum(["register", "reset_password"]).openapi({
    description: "验证码类型：注册 | 重置密码",
    example: "register"
  })
});

export const VerifyEmailRequestSchema = z.object({
  email: z.string().email().openapi({
    description: "邮箱地址",
    example: "user@example.com"
  }),
  code: z.string().length(6).openapi({
    description: "6 位验证码",
    example: "123456"
  })
});

export const ResetPasswordRequestSchema = z.object({
  email: z.string().email().openapi({
    description: "邮箱地址",
    example: "user@example.com"
  }),
  code: z.string().length(6).openapi({
    description: "验证码",
    example: "123456"
  }),
  newPassword: z.string().min(6).max(100).openapi({
    description: "新密码（至少 6 位）",
    example: "newpassword123"
  })
});

// ============ Response Schemas ============

export const UserResponseSchema = z.object({
  id: z.string().uuid().openapi({
    description: "用户 ID (UUID)",
    example: "123e4567-e89b-12d3-a456-426614174000"
  }),
  email: z.string().email().openapi({
    description: "用户邮箱",
    example: "user@example.com"
  }),
  username: z.string().nullable().openapi({
    description: "用户名",
    example: "张三"
  }),
  role: z.enum(["user", "admin"]).openapi({
    description: "用户角色",
    example: "user"
  }),
  status: z.enum(["active", "suspended"]).openapi({
    description: "账户状态",
    example: "active"
  }),
  credits: z.number().int().openapi({
    description: "剩余积分",
    example: 1000
  }),
  totalCreditsUsed: z.number().int().openapi({
    description: "累计使用积分",
    example: 500
  }),
  emailVerified: z.boolean().openapi({
    description: "邮箱是否已验证",
    example: true
  }),
  createdAt: z.string().datetime().openapi({
    description: "账户创建时间（ISO 8601 格式）",
    example: "2025-01-15T08:00:00.000Z"
  })
});

export const LoginResponseSchema = z.object({
  user: UserResponseSchema.openapi({
    description: "用户信息"
  }),
  message: z.string().openapi({
    description: "登录成功消息",
    example: "登录成功"
  })
});

export const RegisterResponseSchema = z.object({
  user: UserResponseSchema.openapi({
    description: "新注册的用户信息"
  }),
  message: z.string().openapi({
    description: "注册成功消息",
    example: "注册成功"
  })
});

export const MessageResponseSchema = z.object({
  message: z.string().openapi({
    description: "操作结果消息",
    example: "操作成功"
  })
});

export const ErrorResponseSchema = z.object({
  error: z.string().openapi({
    description: "错误信息",
    example: "邮箱或密码错误"
  })
});

// ============ TypeScript Types ============

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SendVerificationCodeRequest = z.infer<typeof SendVerificationCodeRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
