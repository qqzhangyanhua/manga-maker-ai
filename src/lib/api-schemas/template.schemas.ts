/**
 * Template API Schemas
 * Zod schemas for Panel Template related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Enums
// ============================================================================

export const TemplateTypeSchema = z
  .enum(["my", "official", "community"])
  .openapi({
    description: "模板类型",
    example: "official",
  });

export const PanelCountRangeSchema = z
  .enum(["1-3", "4-6", "7-12"])
  .openapi({
    description: "分镜数量范围",
    example: "4-6",
  });

// ============================================================================
// Request Schemas
// ============================================================================

export const ListTemplatesQuerySchema = z.object({
  page: z.number().int().min(1).default(1).optional().openapi({
    description: "页码",
    example: 1,
  }),
  limit: z.number().int().min(1).max(100).default(20).optional().openapi({
    description: "每页数量（1-100）",
    example: 20,
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "标签过滤（多个）",
    example: ["action", "dialogue"],
  }),
  type: TemplateTypeSchema.optional(),
  panelCount: PanelCountRangeSchema.optional(),
  search: z.string().optional().openapi({
    description: "搜索关键词",
    example: "对话场景",
  }),
  category: z.string().optional().openapi({
    description: "分类过滤",
  }),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional().openapi({
    description: "难度等级",
  }),
  targetCharacters: z.number().int().optional().openapi({
    description: "目标角色数量",
  }),
});

export const CreateTemplateRequestSchema = z.object({
  name: z.string().min(1).max(100).openapi({
    description: "模板名称",
    example: "经典对话模板",
  }),
  description: z.string().max(500).optional().openapi({
    description: "模板描述",
  }),
  template_data: z.record(z.unknown()).openapi({
    description: "模板数据（JSON 对象）",
  }),
  panel_count: z.number().int().min(1).max(20).openapi({
    description: "分镜数量（1-20）",
    example: 6,
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "标签列表",
    example: ["对话", "人物"],
  }),
  is_public: z.boolean().default(false).optional().openapi({
    description: "是否公开",
    example: false,
  }),
  thumbnail_url: z.string().url().optional().openapi({
    description: "缩略图 URL",
  }),
});

export const UpdateTemplateRequestSchema = z.object({
  name: z.string().min(1).max(100).optional().openapi({
    description: "模板名称",
  }),
  description: z.string().max(500).optional().openapi({
    description: "模板描述",
  }),
  template_data: z.record(z.unknown()).optional().openapi({
    description: "模板数据",
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "标签列表",
  }),
  is_public: z.boolean().optional().openapi({
    description: "是否公开",
  }),
  thumbnail_url: z.string().url().optional().openapi({
    description: "缩略图 URL",
  }),
});

export const ApplyTemplateRequestSchema = z.object({
  story_id: z.string().uuid().optional().openapi({
    description: "应用到的故事 ID",
  }),
  chapter_id: z.string().uuid().optional().openapi({
    description: "应用到的章节 ID",
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const TemplateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  image: z.string().url().nullable(),
});

export const TemplateResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  template_data: z.record(z.unknown()),
  panel_count: z.number().int(),
  tags: z.array(z.string()),
  is_official: z.boolean(),
  is_public: z.boolean(),
  thumbnail_url: z.string().url().nullable(),
  usage_count: z.number().int().openapi({
    description: "使用次数",
    example: 120,
  }),
  like_count: z.number().int().openapi({
    description: "点赞数",
    example: 35,
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  user: TemplateUserSchema.optional().openapi({
    description: "创建者信息",
  }),
});

export const ListTemplatesResponseSchema = z.object({
  success: z.boolean(),
  templates: z.array(TemplateResponseSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const TemplateDetailResponseSchema = z.object({
  success: z.boolean(),
  template: TemplateResponseSchema,
});

export const CreateTemplateResponseSchema = z.object({
  success: z.boolean(),
  template: TemplateResponseSchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "模板创建成功",
  }),
});

export const UpdateTemplateResponseSchema = z.object({
  success: z.boolean(),
  template: TemplateResponseSchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "模板更新成功",
  }),
});

export const DeleteTemplateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().openapi({
    description: "提示消息",
    example: "模板删除成功",
  }),
});

export const ApplyTemplateResponseSchema = z.object({
  success: z.boolean(),
  story_id: z.string().uuid().optional(),
  panels_created: z.number().int().openapi({
    description: "创建的分镜数量",
    example: 6,
  }),
  message: z.string(),
});

export const LikeTemplateResponseSchema = z.object({
  success: z.boolean(),
  liked: z.boolean().openapi({
    description: "当前点赞状态",
    example: true,
  }),
  like_count: z.number().int().openapi({
    description: "点赞总数",
    example: 36,
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type TemplateType = z.infer<typeof TemplateTypeSchema>;
export type PanelCountRange = z.infer<typeof PanelCountRangeSchema>;

export type ListTemplatesQuery = z.infer<typeof ListTemplatesQuerySchema>;
export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequestSchema>;
export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateRequestSchema>;
export type ApplyTemplateRequest = z.infer<typeof ApplyTemplateRequestSchema>;

export type TemplateUser = z.infer<typeof TemplateUserSchema>;
export type TemplateResponse = z.infer<typeof TemplateResponseSchema>;
export type ListTemplatesResponse = z.infer<typeof ListTemplatesResponseSchema>;
export type TemplateDetailResponse = z.infer<typeof TemplateDetailResponseSchema>;
export type CreateTemplateResponse = z.infer<typeof CreateTemplateResponseSchema>;
export type UpdateTemplateResponse = z.infer<typeof UpdateTemplateResponseSchema>;
export type DeleteTemplateResponse = z.infer<typeof DeleteTemplateResponseSchema>;
export type ApplyTemplateResponse = z.infer<typeof ApplyTemplateResponseSchema>;
export type LikeTemplateResponse = z.infer<typeof LikeTemplateResponseSchema>;
