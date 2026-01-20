/**
 * Panel API Schemas
 * Zod schemas for Panel (Storyboard) related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Enums
// ============================================================================

export const PanelTypeSchema = z
  .enum(["dialogue", "action", "transition", "establishing", "closeup", "montage"])
  .openapi({
    description: "分镜类型",
    example: "dialogue",
  });

export const CameraAngleSchema = z
  .enum([
    "extreme_closeup",
    "closeup",
    "medium_shot",
    "full_shot",
    "long_shot",
    "extreme_long_shot",
    "over_shoulder",
    "point_of_view",
    "birds_eye",
    "low_angle",
    "high_angle",
  ])
  .openapi({
    description: "镜头角度",
    example: "medium_shot",
  });

export const LayoutTypeSchema = z
  .enum(["single", "horizontal_split", "vertical_split", "grid_2x2", "custom"])
  .openapi({
    description: "布局类型",
    example: "single",
  });

// ============================================================================
// Request Schemas
// ============================================================================

export const UpdatePanelRequestSchema = z.object({
  panel_type: PanelTypeSchema.optional(),
  content: z.string().max(2000).optional().openapi({
    description: "分镜内容/对白",
  }),
  visual_description: z.string().max(5000).optional().openapi({
    description: "视觉描述",
  }),
  camera_angle: CameraAngleSchema.optional(),
  panel_order: z.number().int().min(1).optional().openapi({
    description: "分镜顺序",
  }),
  character_ids: z.array(z.string().uuid()).optional().openapi({
    description: "出场角色 ID 列表",
  }),
  scene_id: z.string().uuid().nullable().optional().openapi({
    description: "场景 ID",
  }),
});

export const ReorderPanelsRequestSchema = z.object({
  panel_orders: z
    .array(
      z.object({
        id: z.string().uuid().openapi({
          description: "分镜 ID",
        }),
        new_order: z.number().int().min(1).openapi({
          description: "新的顺序",
          example: 1,
        }),
      })
    )
    .min(1)
    .openapi({
      description: "分镜顺序调整列表",
    }),
});

export const BatchUpdatePanelsRequestSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        panel_type: PanelTypeSchema.optional(),
        content: z.string().max(2000).optional(),
        visual_description: z.string().max(5000).optional(),
        camera_angle: CameraAngleSchema.optional(),
      })
    )
    .min(1)
    .max(50)
    .openapi({
      description: "批量更新列表（1-50个）",
    }),
});

export const BatchDeletePanelsRequestSchema = z.object({
  panel_ids: z.array(z.string().uuid()).min(1).max(50).openapi({
    description: "要删除的分镜 ID 列表（1-50个）",
  }),
});

export const GenerateVariantsRequestSchema = z.object({
  variant_count: z.number().int().min(1).max(4).optional().default(3).openapi({
    description: "变体数量（1-4）",
    example: 3,
  }),
  style_key: z.string().optional().openapi({
    description: "漫画风格 key",
  }),
  prompt_adjustments: z.string().max(500).optional().openapi({
    description: "Prompt 调整说明",
    example: "更强调光影效果",
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const PanelDetailSchema = z.object({
  id: z.string().uuid(),
  chapter_id: z.string().uuid(),
  panel_order: z.number().int(),
  panel_type: z.string(),
  content: z.string().nullable(),
  visual_description: z.string().nullable(),
  camera_angle: z.string().nullable(),
  character_ids: z.array(z.string().uuid()),
  scene_id: z.string().uuid().nullable(),
  image_url: z.string().url().nullable().openapi({
    description: "生成的图片 URL",
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const UpdatePanelResponseSchema = z.object({
  panel: PanelDetailSchema,
  message: z.string().openapi({
    description: "提示消息",
    example: "分镜更新成功",
  }),
});

export const ReorderPanelsResponseSchema = z.object({
  updated_count: z.number().int().openapi({
    description: "更新的分镜数量",
    example: 5,
  }),
  message: z.string().openapi({
    description: "提示消息",
    example: "分镜顺序调整成功",
  }),
});

export const BatchUpdatePanelsResponseSchema = z.object({
  updated_panels: z.array(PanelDetailSchema),
  updated_count: z.number().int().openapi({
    description: "更新的分镜数量",
  }),
  message: z.string(),
});

export const BatchDeletePanelsResponseSchema = z.object({
  deleted_count: z.number().int().openapi({
    description: "删除的分镜数量",
  }),
  message: z.string().openapi({
    description: "提示消息",
    example: "成功删除 5 个分镜",
  }),
});

export const GenerateVariantsResponseSchema = z.object({
  variants: z.array(
    z.object({
      id: z.string().uuid(),
      panel_id: z.string().uuid(),
      image_url: z.string().url(),
      prompt: z.string(),
      is_selected: z.boolean(),
      created_at: z.string().datetime(),
    })
  ),
  task_id: z.string().uuid().optional().openapi({
    description: "异步任务 ID",
  }),
  message: z.string().openapi({
    description: "提示消息",
  }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type PanelType = z.infer<typeof PanelTypeSchema>;
export type CameraAngle = z.infer<typeof CameraAngleSchema>;
export type LayoutType = z.infer<typeof LayoutTypeSchema>;

export type UpdatePanelRequest = z.infer<typeof UpdatePanelRequestSchema>;
export type ReorderPanelsRequest = z.infer<typeof ReorderPanelsRequestSchema>;
export type BatchUpdatePanelsRequest = z.infer<typeof BatchUpdatePanelsRequestSchema>;
export type BatchDeletePanelsRequest = z.infer<typeof BatchDeletePanelsRequestSchema>;
export type GenerateVariantsRequest = z.infer<typeof GenerateVariantsRequestSchema>;

export type PanelDetail = z.infer<typeof PanelDetailSchema>;
export type UpdatePanelResponse = z.infer<typeof UpdatePanelResponseSchema>;
export type ReorderPanelsResponse = z.infer<typeof ReorderPanelsResponseSchema>;
export type BatchUpdatePanelsResponse = z.infer<typeof BatchUpdatePanelsResponseSchema>;
export type BatchDeletePanelsResponse = z.infer<typeof BatchDeletePanelsResponseSchema>;
export type GenerateVariantsResponse = z.infer<typeof GenerateVariantsResponseSchema>;
