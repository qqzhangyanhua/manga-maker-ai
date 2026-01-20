/**
 * Profile API Schemas
 * Zod schemas for User Profile related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Request Schemas
// ============================================================================

export const UpdateProfileRequestSchema = z.object({
  name: z.string().min(1).max(50).optional().openapi({
    description: "用户名（1-50个字符）",
    example: "张三",
  }),
  image: z.string().url().nullable().optional().openapi({
    description: "头像 URL",
  }),
});

export const ChangePasswordRequestSchema = z.object({
  oldPassword: z.string().min(6).openapi({
    description: "当前密码",
  }),
  newPassword: z.string().min(6).max(100).openapi({
    description: "新密码（6-100个字符）",
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().url().nullable(),
  verified: z.boolean().openapi({
    description: "邮箱是否已验证",
    example: true,
  }),
  role: z.string().openapi({
    description: "用户角色",
    example: "user",
  }),
  status: z.string().openapi({
    description: "账户状态",
    example: "active",
  }),
  credits: z.number().int().openapi({
    description: "当前积分余额",
    example: 100,
  }),
  total_credits_used: z.number().int().openapi({
    description: "累计消费积分",
    example: 500,
  }),
  created_at: z.string().datetime(),
});

export const UpdateProfileResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    user: UserProfileSchema,
  }),
  message: z.string().openapi({
    description: "提示消息",
    example: "更新成功",
  }),
});

export const ChangePasswordResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().openapi({
    description: "提示消息",
    example: "密码修改成功",
  }),
});

export const SharedContentSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["story", "character", "template"]).openapi({
    description: "分享内容类型",
  }),
  title: z.string(),
  description: z.string().nullable(),
  thumbnail_url: z.string().url().nullable(),
  view_count: z.number().int().openapi({
    description: "浏览次数",
    example: 120,
  }),
  like_count: z.number().int().openapi({
    description: "点赞数",
    example: 35,
  }),
  created_at: z.string().datetime(),
});

export const SharedContentResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    shared_items: z.array(SharedContentSchema),
    pagination: z.object({
      total: z.number().int(),
      page: z.number().int(),
      limit: z.number().int(),
      totalPages: z.number().int(),
    }),
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;
export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponseSchema>;
export type SharedContent = z.infer<typeof SharedContentSchema>;
export type SharedContentResponse = z.infer<typeof SharedContentResponseSchema>;
