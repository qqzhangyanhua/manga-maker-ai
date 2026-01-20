/**
 * Comic Styles API Schemas
 * Zod schemas for Comic Style related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Request Schemas
// ============================================================================

export const ListComicStylesQuerySchema = z.object({
  enabled: z.boolean().optional().default(true).openapi({
    description: "是否只返回启用的风格",
    example: true,
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const ComicStyleResponseSchema = z.object({
  id: z.string().uuid(),
  style_key: z.string().openapi({
    description: "风格唯一标识",
    example: "anime_style",
  }),
  name_zh: z.string().openapi({
    description: "中文名称",
    example: "日系动漫",
  }),
  name_en: z.string().openapi({
    description: "英文名称",
    example: "Anime Style",
  }),
  image_url: z.string().url().nullable().openapi({
    description: "预览图 URL",
  }),
  tag_color: z.string().nullable().openapi({
    description: "标签颜色（CSS颜色值）",
    example: "#FF6B6B",
  }),
  description: z.string().nullable().openapi({
    description: "风格描述",
  }),
  prompt_prefix: z.string().nullable().openapi({
    description: "AI 生成提示词前缀",
    example: "anime style, vibrant colors, clean lines",
  }),
  sort_order: z.number().int().openapi({
    description: "排序顺序",
    example: 1,
  }),
  enabled: z.boolean().openapi({
    description: "是否启用",
    example: true,
  }),
  usage_count: z.number().int().openapi({
    description: "使用次数",
    example: 120,
  }),
});

export const ListComicStylesResponseSchema = z.object({
  data: z.array(ComicStyleResponseSchema),
  total: z.number().int(),
});

export const ComicStyleDetailResponseSchema = z.object({
  success: z.boolean(),
  style: ComicStyleResponseSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

export type ListComicStylesQuery = z.infer<typeof ListComicStylesQuerySchema>;

export type ComicStyleResponse = z.infer<typeof ComicStyleResponseSchema>;
export type ListComicStylesResponse = z.infer<typeof ListComicStylesResponseSchema>;
export type ComicStyleDetailResponse = z.infer<typeof ComicStyleDetailResponseSchema>;
