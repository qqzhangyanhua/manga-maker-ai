/**
 * Chapter API Schemas
 * Zod schemas for Chapter-related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Sub-schemas
// ============================================================================

export const PanelSchema = z
  .object({
    id: z.string().uuid().openapi({
      description: "分镜 ID",
    }),
    chapter_id: z.string().uuid().openapi({
      description: "章节 ID",
    }),
    panel_order: z.number().int().openapi({
      description: "分镜顺序",
      example: 1,
    }),
    panel_type: z.string().openapi({
      description: "分镜类型",
      example: "dialogue",
    }),
    content: z.string().nullable().openapi({
      description: "分镜内容/对白",
    }),
    visual_description: z.string().nullable().openapi({
      description: "视觉描述",
    }),
    camera_angle: z.string().nullable().openapi({
      description: "镜头角度",
      example: "medium_shot",
    }),
    character_ids: z.array(z.string().uuid()).openapi({
      description: "出场角色 ID 列表",
    }),
    scene_id: z.string().uuid().nullable().openapi({
      description: "场景 ID",
    }),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .openapi("Panel", {
    description: "分镜对象",
  });

export const CharacterStateSchema = z
  .object({
    character_id: z.string().uuid().openapi({
      description: "角色 ID",
    }),
    character_name: z.string().openapi({
      description: "角色名称",
      example: "李明",
    }),
    outfit_id: z.string().uuid().nullable().openapi({
      description: "服装 ID",
    }),
    expression: z.string().nullable().openapi({
      description: "表情",
      example: "happy",
    }),
    pose_description: z.string().nullable().openapi({
      description: "姿态描述",
    }),
  })
  .openapi("CharacterState", {
    description: "角色状态",
  });

// ============================================================================
// Request Schemas
// ============================================================================

export const UpdateChapterRequestSchema = z.object({
  title: z.string().min(1).max(200).optional().openapi({
    description: "章节标题",
  }),
  summary: z.string().max(5000).optional().openapi({
    description: "章节摘要",
  }),
  content: z.string().optional().openapi({
    description: "章节内容",
  }),
  chapter_order: z.number().int().min(1).optional().openapi({
    description: "章节顺序",
  }),
});

export const GeneratePanelsRequestSchema = z.object({
  project_id: z.string().uuid().openapi({
    description: "项目 ID",
  }),
  panel_count: z.number().int().min(1).max(50).optional().openapi({
    description: "期望生成的分镜数量（1-50）",
    example: 12,
  }),
  overwrite: z.boolean().optional().default(false).openapi({
    description: "是否覆盖已有分镜",
    example: false,
  }),
});

export const ExpandContentRequestSchema = z.object({
  target_word_count: z.number().int().min(500).max(50000).optional().openapi({
    description: "目标字数（500-50000）",
    example: 3000,
  }),
  focus_areas: z.array(z.string()).optional().openapi({
    description: "重点扩展的方面",
    example: ["对话", "场景描述", "内心独白"],
  }),
});

export const PublishChapterRequestSchema = z.object({
  publish: z.boolean().openapi({
    description: "是否发布（true）或取消发布（false）",
    example: true,
  }),
});

export const GenerateNineGridRequestSchema = z.object({
  plot_summary: z.string().max(2000).optional().openapi({
    description: "剧情摘要（如不提供则使用 chapter.summary）",
  }),
  style_key: z.string().optional().openapi({
    description: "漫画风格 key",
    example: "anime_style",
  }),
});

export const BatchGenerateScenesRequestSchema = z.object({
  panel_ids: z.array(z.string().uuid()).min(1).max(20).openapi({
    description: "分镜 ID 列表（1-20个）",
  }),
  style_key: z.string().optional().openapi({
    description: "漫画风格 key",
  }),
});

export const EstimatePanelsRequestSchema = z.object({
  target_panel_count: z.number().int().min(1).max(100).optional().openapi({
    description: "目标分镜数量",
    example: 20,
  }),
});

// ============================================================================
// Response Schemas
// ============================================================================

export const ChapterDetailResponseSchema = z.object({
  success: z.boolean().openapi({
    description: "请求是否成功",
    example: true,
  }),
  chapter: z
    .object({
      id: z.string().uuid(),
      story_id: z.string().uuid(),
      title: z.string(),
      summary: z.string().nullable(),
      content: z.string().nullable(),
      chapter_order: z.number().int(),
      publish_status: z.string().nullable(),
      published_at: z.string().datetime().nullable(),
      created_at: z.string().datetime(),
      updated_at: z.string().datetime(),
      story: z.object({
        user_id: z.string().uuid(),
      }),
      panels: z.array(PanelSchema),
    })
    .openapi({
      description: "章节详情（包含分镜列表）",
    }),
});

export const UpdateChapterResponseSchema = z.object({
  success: z.boolean(),
  chapter: z.object({
    id: z.string().uuid(),
    story_id: z.string().uuid(),
    title: z.string(),
    summary: z.string().nullable(),
    content: z.string().nullable(),
    chapter_order: z.number().int(),
    publish_status: z.string().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  }),
  message: z.string().openapi({
    description: "提示消息",
    example: "章节更新成功",
  }),
});

export const DeleteChapterResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().openapi({
    description: "提示消息",
    example: "章节删除成功",
  }),
});

export const GeneratePanelsResponseSchema = z.object({
  panels: z.array(PanelSchema).openapi({
    description: "生成的分镜列表",
  }),
  metadata: z
    .object({
      chapter_id: z.string().uuid(),
      total_panels: z.number().int().openapi({
        description: "总分镜数",
        example: 12,
      }),
      generation_time_ms: z.number().int().openapi({
        description: "生成耗时（毫秒）",
        example: 5000,
      }),
    })
    .optional()
    .openapi({
      description: "生成元数据",
    }),
});

export const ExpandContentResponseSchema = z.object({
  expanded_content: z.string().openapi({
    description: "扩展后的章节内容",
  }),
  original_word_count: z.number().int().openapi({
    description: "原始字数",
    example: 800,
  }),
  new_word_count: z.number().int().openapi({
    description: "扩展后字数",
    example: 3000,
  }),
  message: z.string().openapi({
    description: "提示消息",
  }),
});

export const PublishChapterResponseSchema = z.object({
  success: z.boolean(),
  chapter: z.object({
    id: z.string().uuid(),
    publish_status: z.string().nullable(),
    published_at: z.string().datetime().nullable(),
  }),
  message: z.string().openapi({
    description: "提示消息",
    example: "章节已发布",
  }),
});

export const CharacterStatesResponseSchema = z.object({
  character_states: z.array(CharacterStateSchema).openapi({
    description: "角色状态列表",
  }),
});

export const NineGridImageSchema = z
  .object({
    index: z.number().int().min(0).max(8).openapi({
      description: "格子索引（0-8）",
      example: 0,
    }),
    image_url: z.string().url().openapi({
      description: "图片 URL",
    }),
    caption: z.string().openapi({
      description: "格子说明",
      example: "主角发现秘密",
    }),
  })
  .openapi("NineGridImage", {
    description: "九宫格图片",
  });

export const GenerateNineGridResponseSchema = z.object({
  nine_grid: z.array(NineGridImageSchema).openapi({
    description: "九宫格图片列表",
  }),
  task_id: z.string().uuid().optional().openapi({
    description: "异步任务 ID",
  }),
  message: z.string().openapi({
    description: "提示消息",
  }),
});

export const SceneGenerationResultSchema = z
  .object({
    panel_id: z.string().uuid(),
    image_url: z.string().url().nullable(),
    status: z.enum(["success", "failed", "pending"]).openapi({
      description: "生成状态",
    }),
    error: z.string().optional().openapi({
      description: "错误信息（如果失败）",
    }),
  })
  .openapi("SceneGenerationResult", {
    description: "场景生成结果",
  });

export const BatchGenerateScenesResponseSchema = z.object({
  results: z.array(SceneGenerationResultSchema).openapi({
    description: "批量生成结果",
  }),
  summary: z
    .object({
      total: z.number().int().openapi({
        description: "总数",
        example: 10,
      }),
      success: z.number().int().openapi({
        description: "成功数",
        example: 8,
      }),
      failed: z.number().int().openapi({
        description: "失败数",
        example: 2,
      }),
    })
    .openapi({
      description: "生成摘要",
    }),
});

export const EstimatePanelsResponseSchema = z.object({
  estimated_panel_count: z.number().int().openapi({
    description: "预估分镜数量",
    example: 18,
  }),
  recommendation: z.string().openapi({
    description: "建议",
    example: "根据章节内容，建议生成 18-22 个分镜",
  }),
  breakdown: z
    .object({
      dialogue_panels: z.number().int().optional().openapi({
        description: "对话分镜数",
        example: 10,
      }),
      action_panels: z.number().int().optional().openapi({
        description: "动作分镜数",
        example: 8,
      }),
    })
    .optional()
    .openapi({
      description: "分镜类型分解",
    }),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Panel = z.infer<typeof PanelSchema>;
export type CharacterState = z.infer<typeof CharacterStateSchema>;

export type UpdateChapterRequest = z.infer<typeof UpdateChapterRequestSchema>;
export type GeneratePanelsRequest = z.infer<typeof GeneratePanelsRequestSchema>;
export type ExpandContentRequest = z.infer<typeof ExpandContentRequestSchema>;
export type PublishChapterRequest = z.infer<typeof PublishChapterRequestSchema>;
export type GenerateNineGridRequest = z.infer<typeof GenerateNineGridRequestSchema>;
export type BatchGenerateScenesRequest = z.infer<typeof BatchGenerateScenesRequestSchema>;
export type EstimatePanelsRequest = z.infer<typeof EstimatePanelsRequestSchema>;

export type ChapterDetailResponse = z.infer<typeof ChapterDetailResponseSchema>;
export type UpdateChapterResponse = z.infer<typeof UpdateChapterResponseSchema>;
export type DeleteChapterResponse = z.infer<typeof DeleteChapterResponseSchema>;
export type GeneratePanelsResponse = z.infer<typeof GeneratePanelsResponseSchema>;
export type ExpandContentResponse = z.infer<typeof ExpandContentResponseSchema>;
export type PublishChapterResponse = z.infer<typeof PublishChapterResponseSchema>;
export type CharacterStatesResponse = z.infer<typeof CharacterStatesResponseSchema>;
export type NineGridImage = z.infer<typeof NineGridImageSchema>;
export type GenerateNineGridResponse = z.infer<typeof GenerateNineGridResponseSchema>;
export type SceneGenerationResult = z.infer<typeof SceneGenerationResultSchema>;
export type BatchGenerateScenesResponse = z.infer<typeof BatchGenerateScenesResponseSchema>;
export type EstimatePanelsResponse = z.infer<typeof EstimatePanelsResponseSchema>;
