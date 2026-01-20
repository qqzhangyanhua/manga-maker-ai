/**
 * LLM Providers API Schemas
 * Zod schemas for LLM Provider configuration endpoints (Admin only)
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateProviderRequestSchema = z.object({
  provider_type: z.string().min(1).openapi({
    description: "提供商类型（story_generation, image_generation 等）",
    example: "story_generation",
  }),
  provider_name: z.string().min(1).default("openai").openapi({
    description: "提供商名称",
    example: "openai",
  }),
  model: z.string().min(1).openapi({
    description: "模型名称",
    example: "gpt-4-turbo",
  }),
  base_url: z.string().url().min(1).openapi({
    description: "API 基础 URL",
    example: "https://api.openai.com/v1",
  }),
  api_key: z.string().default("").openapi({
    description: "API 密钥",
  }),
  priority: z.number().int().positive().default(1).openapi({
    description: "优先级（数字越小优先级越高）",
    example: 1,
  }),
  enabled: z.boolean().default(true).openapi({
    description: "是否启用",
    example: true,
  }),
  desc: z.string().nullable().optional().openapi({
    description: "描述",
  }),
  credits_cost: z.number().int().min(0).default(0).openapi({
    description: "每次调用消耗的积分",
    example: 10,
  }),
});

export const UpdateProviderRequestSchema = z.object({
  provider_name: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  base_url: z.string().url().optional(),
  api_key: z.string().optional(),
  priority: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
  desc: z.string().nullable().optional(),
  credits_cost: z.number().int().min(0).optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const LlmProviderSchema = z.object({
  id: z.string().uuid(),
  provider_type: z.string(),
  provider_name: z.string(),
  model: z.string(),
  base_url: z.string().url(),
  api_key: z.string().openapi({
    description: "API密钥（可能被部分隐藏）",
  }),
  priority: z.number().int(),
  enabled: z.boolean(),
  desc: z.string().nullable(),
  credits_cost: z.number().int(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ListProvidersResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    providers: z.array(LlmProviderSchema),
  }),
});

export const ProviderDetailResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    provider: LlmProviderSchema,
  }),
});

export const CreateProviderResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    provider: LlmProviderSchema,
  }),
  message: z.string().optional().openapi({
    description: "提示消息",
    example: "提供商创建成功",
  }),
});

export const UpdateProviderResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    provider: LlmProviderSchema,
  }),
  message: z.string().optional(),
});

export const DeleteProviderResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().openapi({
    description: "提示消息",
    example: "提供商删除成功",
  }),
});

export const ProviderTypesResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    types: z.array(z.string()).openapi({
      description: "可用的提供商类型列表",
      example: ["story_generation", "image_generation", "text_generation"],
    }),
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateProviderRequest = z.infer<typeof CreateProviderRequestSchema>;
export type UpdateProviderRequest = z.infer<typeof UpdateProviderRequestSchema>;

export type LlmProvider = z.infer<typeof LlmProviderSchema>;
export type ListProvidersResponse = z.infer<typeof ListProvidersResponseSchema>;
export type ProviderDetailResponse = z.infer<typeof ProviderDetailResponseSchema>;
export type CreateProviderResponse = z.infer<typeof CreateProviderResponseSchema>;
export type UpdateProviderResponse = z.infer<typeof UpdateProviderResponseSchema>;
export type DeleteProviderResponse = z.infer<typeof DeleteProviderResponseSchema>;
export type ProviderTypesResponse = z.infer<typeof ProviderTypesResponseSchema>;
