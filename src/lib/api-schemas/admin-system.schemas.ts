/**
 * Admin System Management API Schemas
 * Zod schemas for Admin system monitoring and management endpoints (Admin only)
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateTagRequestSchema = z.object({
  name: z.string().min(1).max(50).openapi({
    description: "标签名称",
    example: "科幻",
  }),
  type: z.enum(["system", "user"]).openapi({
    description: "标签类型（system=系统标签，user=用户标签）",
    example: "system",
  }),
  category: z.string().max(50).optional().openapi({
    description: "标签分类",
    example: "genre",
  }),
});

export const UpdateTagRequestSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: z.enum(["system", "user"]).optional(),
  category: z.string().max(50).optional(),
});

export const MergeTagsRequestSchema = z.object({
  source_tag_id: z.string().uuid().openapi({
    description: "源标签 ID（将被合并）",
  }),
  target_tag_id: z.string().uuid().openapi({
    description: "目标标签 ID（保留）",
  }),
});

export const ListTagsQuerySchema = z.object({
  page: z.number().int().min(1).default(1).optional().openapi({
    description: "页码",
    example: 1,
  }),
  limit: z.number().int().min(1).max(200).default(20).optional().openapi({
    description: "每页数量（1-200）",
    example: 20,
  }),
  keyword: z.string().optional().openapi({
    description: "关键词搜索",
  }),
  type: z.string().optional().openapi({
    description: "标签类型筛选（system/user/all）",
    example: "system",
  }),
  category: z.string().optional().openapi({
    description: "分类筛选",
  }),
});

export const ListTransactionsQuerySchema = z.object({
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
  userId: z.string().uuid().optional().openapi({
    description: "按用户 ID 筛选",
  }),
  action: z.string().optional().openapi({
    description: "按操作类型筛选（register/consume/recharge/admin_adjust/refund）",
    example: "consume",
  }),
});

export const ListUsageQuerySchema = z.object({
  userId: z.string().uuid().optional().openapi({
    description: "按用户 ID 筛选",
  }),
  limit: z.number().int().min(1).max(200).default(50).optional().openapi({
    description: "日志条数限制",
    example: 50,
  }),
  days: z.number().int().min(1).max(30).default(7).optional().openapi({
    description: "统计天数（1-30天）",
    example: 7,
  }),
  from: z.string().datetime().optional().openapi({
    description: "开始时间（ISO 8601）",
  }),
  to: z.string().datetime().optional().openapi({
    description: "结束时间（ISO 8601）",
  }),
  action: z.string().optional().openapi({
    description: "操作类型筛选",
    example: "image_generation",
  }),
  status: z.string().optional().openapi({
    description: "状态筛选（success/failed）",
    example: "success",
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string().openapi({
    description: "标签类型（system/user）",
    example: "system",
  }),
  category: z.string().nullable(),
  usage_count: z.number().int().openapi({
    description: "使用次数",
    example: 120,
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ListTagsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    items: z.array(TagSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const TagDetailResponseSchema = z.object({
  success: z.boolean(),
  data: TagSchema,
  message: z.string().optional(),
});

export const MergeTagsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().openapi({
    description: "合并结果消息",
    example: "标签合并成功，已更新 50 条关联记录",
  }),
});

export const TransactionWithUserSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: z.string().openapi({
    description: "操作类型",
    example: "consume",
  }),
  amount: z.number().int().openapi({
    description: "积分变动量（正为增加，负为消费）",
    example: -10,
  }),
  balance_after: z.number().int().openapi({
    description: "操作后余额",
    example: 490,
  }),
  description: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
  }),
});

export const AdminListTransactionsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    transactions: z.array(TransactionWithUserSchema),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
      hasMore: z.boolean(),
    }),
  }),
});

export const UsageStatSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: z.string(),
  count: z.number().int().openapi({
    description: "操作次数",
    example: 10,
  }),
  total_credits: z.number().int().openapi({
    description: "消耗的总积分",
    example: 100,
  }),
  date: z.string().datetime().openapi({
    description: "统计日期",
  }),
});

export const GenerationLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: z.string(),
  status: z.string().openapi({
    description: "执行状态（success/failed）",
    example: "success",
  }),
  credits_used: z.number().int().openapi({
    description: "消耗积分",
    example: 10,
  }),
  metadata: z.record(z.unknown()).nullable(),
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const ListUsageResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    usageStats: z.array(UsageStatSchema),
    generationLogs: z.array(GenerationLogSchema),
    meta: z.object({
      since: z.string().datetime(),
      until: z.string().datetime(),
      limit: z.number().int(),
      userId: z.string().uuid().nullable(),
      action: z.string().nullable(),
      status: z.string().nullable(),
    }),
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateTagRequest = z.infer<typeof CreateTagRequestSchema>;
export type UpdateTagRequest = z.infer<typeof UpdateTagRequestSchema>;
export type MergeTagsRequest = z.infer<typeof MergeTagsRequestSchema>;
export type ListTagsQuery = z.infer<typeof ListTagsQuerySchema>;
export type ListTransactionsQuery = z.infer<typeof ListTransactionsQuerySchema>;
export type ListUsageQuery = z.infer<typeof ListUsageQuerySchema>;

export type Tag = z.infer<typeof TagSchema>;
export type ListTagsResponse = z.infer<typeof ListTagsResponseSchema>;
export type TagDetailResponse = z.infer<typeof TagDetailResponseSchema>;
export type MergeTagsResponse = z.infer<typeof MergeTagsResponseSchema>;
export type TransactionWithUser = z.infer<typeof TransactionWithUserSchema>;
export type ListTransactionsResponse = z.infer<typeof AdminListTransactionsResponseSchema>;
export type UsageStat = z.infer<typeof UsageStatSchema>;
export type GenerationLog = z.infer<typeof GenerationLogSchema>;
export type ListUsageResponse = z.infer<typeof ListUsageResponseSchema>;
