/**
 * Admin Users API Schemas
 * Zod schemas for Admin User Management endpoints (Admin only)
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateUserRequestSchema = z.object({
  email: z.string().email().openapi({
    description: "用户邮箱",
    example: "user@example.com",
  }),
  password: z.string().min(8).max(64).openapi({
    description: "用户密码（8-64位）",
    example: "password123",
  }),
  name: z.string().min(1).max(64).optional().openapi({
    description: "用户名",
    example: "张三",
  }),
  role: z.enum(["user", "admin"]).default("user").openapi({
    description: "用户角色",
    example: "user",
  }),
  status: z.enum(["active", "banned"]).default("active").openapi({
    description: "用户状态",
    example: "active",
  }),
  verified: z.boolean().default(true).openapi({
    description: "是否已验证邮箱",
    example: true,
  }),
});

export const UpdateUserRequestSchema = z.object({
  name: z.string().min(1).max(64).optional().openapi({
    description: "用户名",
  }),
  role: z.enum(["user", "admin"]).optional().openapi({
    description: "用户角色",
  }),
  status: z.enum(["active", "banned"]).optional().openapi({
    description: "用户状态",
  }),
  verified: z.boolean().optional().openapi({
    description: "是否已验证邮箱",
  }),
  password: z.string().min(8).max(64).optional().openapi({
    description: "新密码（可选）",
  }),
});

export const RechargeCreditsRequestSchema = z.object({
  amount: z.number().int().positive().openapi({
    description: "充值金额（正整数）",
    example: 1000,
  }),
  description: z.string().min(1).max(200).optional().openapi({
    description: "充值说明",
    example: "管理员充值 1000 算力",
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.string().openapi({
    description: "用户角色（user/admin）",
    example: "user",
  }),
  status: z.string().openapi({
    description: "用户状态（active/banned）",
    example: "active",
  }),
  verified: z.boolean(),
  credits: z.number().int().openapi({
    description: "剩余算力",
    example: 500,
  }),
  total_credits_used: z.number().int().openapi({
    description: "累计消费算力",
    example: 1500,
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ListUsersResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    users: z.array(AdminUserSchema),
  }),
});

export const UserDetailResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: AdminUserSchema,
  }),
});

export const CreateUserResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: AdminUserSchema,
  }),
});

export const UpdateUserResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: AdminUserSchema,
  }),
});

export const DeleteUserResponseSchema = z.object({
  success: z.boolean(),
});

export const RechargeCreditsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().openapi({
    description: "充值结果消息",
    example: "成功为用户 user@example.com 充值 1000 算力",
  }),
  data: z.object({
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      credits: z.number().int().openapi({
        description: "充值后的剩余算力",
        example: 1500,
      }),
      total_credits_used: z.number().int(),
    }).nullable(),
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type RechargeCreditsRequest = z.infer<typeof RechargeCreditsRequestSchema>;

export type AdminUser = z.infer<typeof AdminUserSchema>;
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;
export type UserDetailResponse = z.infer<typeof UserDetailResponseSchema>;
export type CreateUserResponse = z.infer<typeof CreateUserResponseSchema>;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
export type DeleteUserResponse = z.infer<typeof DeleteUserResponseSchema>;
export type RechargeCreditsResponse = z.infer<typeof RechargeCreditsResponseSchema>;
