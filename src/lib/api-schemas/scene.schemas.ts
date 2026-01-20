/**
 * Scene API Schemas
 * Zod schemas for Scene (Background/Location Library) related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Enums
// ============================================================================

export const SceneTypeSchema = z
  .enum([
    "indoor",
    "outdoor",
    "urban",
    "nature",
    "fantasy",
    "scifi",
    "historical",
    "abstract",
  ])
  .openapi({
    description: "场景类型",
    example: "urban",
  });

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateSceneRequestSchema = z.object({
  name: z.string().min(1).max(100).openapi({
    description: "场景名称",
    example: "现代都市街景",
  }),
  description: z.string().max(500).optional().openapi({
    description: "场景描述",
    example: "繁华的都市街道，高楼大厦林立，霓虹灯闪烁",
  }),
  scene_type: SceneTypeSchema,
  image_url: z.string().url().optional().openapi({
    description: "场景参考图 URL",
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "场景标签",
    example: ["都市", "现代", "夜晚"],
  }),
  prompt: z.string().max(1000).optional().openapi({
    description: "AI 生成提示词",
    example: "modern city street at night, neon lights, cyberpunk style",
  }),
});

export const UpdateSceneRequestSchema = z.object({
  name: z.string().min(1).max(100).optional().openapi({
    description: "场景名称",
  }),
  description: z.string().max(500).nullable().optional().openapi({
    description: "场景描述",
  }),
  scene_type: SceneTypeSchema.optional(),
  image_url: z.string().url().nullable().optional().openapi({
    description: "场景参考图 URL",
  }),
  tags: z.array(z.string()).optional().openapi({
    description: "场景标签",
  }),
  prompt: z.string().max(1000).nullable().optional().openapi({
    description: "AI 生成提示词",
  }),
});

export const ListScenesQuerySchema = z.object({
  scene_type: SceneTypeSchema.optional().openapi({
    description: "过滤场景类型",
  }),
  source_chapter_id: z.string().uuid().optional().openapi({
    description: "过滤来源章节 ID",
  }),
  is_ai_generated: z.boolean().optional().openapi({
    description: "过滤 AI 生成的场景",
    example: true,
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const SceneResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  scene_type: z.string(),
  image_url: z.string().url().nullable(),
  tags: z.array(z.string()),
  prompt: z.string().nullable(),
  usage_count: z.number().int().openapi({
    description: "使用次数",
    example: 5,
  }),
  is_ai_generated: z.boolean().openapi({
    description: "是否 AI 生成",
    example: false,
  }),
  source_chapter_id: z.string().uuid().nullable().openapi({
    description: "来源章节 ID（AI 生成场景）",
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ListScenesResponseSchema = z.object({
  scenes: z.array(SceneResponseSchema),
});

export const CreateSceneResponseSchema = z.object({
  scene: SceneResponseSchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "场景创建成功",
  }),
});

export const UpdateSceneResponseSchema = z.object({
  scene: SceneResponseSchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "场景更新成功",
  }),
});

export const DeleteSceneResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().openapi({
    description: "提示消息",
    example: "场景删除成功",
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type SceneType = z.infer<typeof SceneTypeSchema>;

export type CreateSceneRequest = z.infer<typeof CreateSceneRequestSchema>;
export type UpdateSceneRequest = z.infer<typeof UpdateSceneRequestSchema>;
export type ListScenesQuery = z.infer<typeof ListScenesQuerySchema>;

export type SceneResponse = z.infer<typeof SceneResponseSchema>;
export type ListScenesResponse = z.infer<typeof ListScenesResponseSchema>;
export type CreateSceneResponse = z.infer<typeof CreateSceneResponseSchema>;
export type UpdateSceneResponse = z.infer<typeof UpdateSceneResponseSchema>;
export type DeleteSceneResponse = z.infer<typeof DeleteSceneResponseSchema>;
