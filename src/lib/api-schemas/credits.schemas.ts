/**
 * Credits API Schemas
 * Zod schemas for Credits System related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Enums
// ============================================================================

export const CreditActionSchema = z
  .enum(["register", "consume", "recharge", "admin_adjust", "refund"])
  .openapi({
    description: "积分操作类型",
    example: "consume",
  });

// ============================================================================
// Request Schemas
// ============================================================================

export const GetCreditsQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20).optional().openapi({
    description: "交易记录数量（1-100）",
    example: 20,
  }),
  offset: z.number().int().min(0).default(0).optional().openapi({
    description: "偏移量",
    example: 0,
  }),
  action: CreditActionSchema.optional().openapi({
    description: "筛选交易类型",
  }),
});

export const GetTransactionsQuerySchema = z.object({
  page: z.number().int().min(1).default(1).optional().openapi({
    description: "页码",
    example: 1,
  }),
  limit: z.number().int().min(1).max(100).default(20).optional().openapi({
    description: "每页数量（1-100）",
    example: 20,
  }),
  action: CreditActionSchema.optional(),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const CreditTransactionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: z.string(),
  amount: z.number().int().openapi({
    description: "积分变动量（正为增加，负为消费）",
    example: -10,
  }),
  balance_after: z.number().int().openapi({
    description: "交易后余额",
    example: 90,
  }),
  description: z.string().nullable().openapi({
    description: "交易描述",
    example: "生成故事大纲",
  }),
  metadata: z.record(z.unknown()).nullable().openapi({
    description: "额外元数据",
  }),
  created_at: z.string().datetime(),
});

export const CreditsInfoResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    credits: z.number().int().openapi({
      description: "当前积分余额",
      example: 100,
    }),
    totalUsed: z.number().int().openapi({
      description: "累计消费积分",
      example: 500,
    }),
    transactions: z.array(CreditTransactionSchema),
    pagination: z.object({
      total: z.number().int(),
      limit: z.number().int(),
      offset: z.number().int(),
      hasMore: z.boolean().openapi({
        description: "是否有更多记录",
        example: true,
      }),
    }),
  }),
});

export const ListTransactionsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    transactions: z.array(CreditTransactionSchema),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
      hasMore: z.boolean(),
    }),
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreditAction = z.infer<typeof CreditActionSchema>;

export type GetCreditsQuery = z.infer<typeof GetCreditsQuerySchema>;
export type GetTransactionsQuery = z.infer<typeof GetTransactionsQuerySchema>;

export type CreditTransaction = z.infer<typeof CreditTransactionSchema>;
export type CreditsInfoResponse = z.infer<typeof CreditsInfoResponseSchema>;
export type ListTransactionsResponse = z.infer<typeof ListTransactionsResponseSchema>;
