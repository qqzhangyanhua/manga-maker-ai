/**
 * Canvas API Schemas
 * Zod schemas for Canvas (Novel-to-Comic Workflow) related endpoints
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// ============================================================================
// Enums
// ============================================================================

export const ScriptStatusSchema = z
  .enum(["pending", "generating", "completed", "error"])
  .openapi({
    description: "剧本生成状态",
    example: "completed",
  });

export const ShotStatusSchema = z
  .enum(["pending", "generating", "completed", "error"])
  .openapi({
    description: "镜头设计状态",
    example: "completed",
  });

export const CameraAngleSchema = z
  .enum(["eye_level", "high_angle", "low_angle", "bird_eye", "worm_eye", "dutch_angle"])
  .openapi({
    description: "摄像机角度",
    example: "eye_level",
  });

export const ShotSizeSchema = z
  .enum(["extreme_close_up", "close_up", "medium_shot", "full_shot", "long_shot", "extreme_long_shot"])
  .openapi({
    description: "景别（镜头大小）",
    example: "medium_shot",
  });

export const PanelTypeSchema = z
  .enum(["standard", "splash", "inset", "borderless", "multi_panel"])
  .openapi({
    description: "分镜类型",
    example: "standard",
  });

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateTimelineRequestSchema = z.object({
  novel_project_id: z.string().uuid().openapi({
    description: "小说项目 ID",
  }),
  title: z.string().min(1).max(200).openapi({
    description: "时间线标题",
    example: "第一季剧本",
  }),
  config: z.object({
    auto_generate: z.boolean().optional().openapi({
      description: "是否自动生成",
      example: true,
    }),
    use_character_library: z.boolean().optional().openapi({
      description: "是否使用角色库",
      example: true,
    }),
    use_scene_library: z.boolean().optional().openapi({
      description: "是否使用场景库",
      example: true,
    }),
  }).optional().openapi({
    description: "时间线配置",
  }),
});

export const GenerateScriptRequestSchema = z.object({}).openapi({
  description: "生成剧本请求（无需额外参数，使用章节内容）",
});

export const GenerateShotsRequestSchema = z.object({
  target_shot_count: z.number().int().min(1).max(50).optional().openapi({
    description: "目标镜头数量（1-50）",
    example: 10,
  }),
});

export const ShotWorkflowStatusSchema = z
  .enum(["pending", "generating", "completed", "error"])
  .openapi({
    description: "分镜工作流状态",
    example: "pending",
  });

export const SelectionStatusSchema = z
  .enum(["pending", "selected", "refined"])
  .openapi({
    description: "图片选择状态",
    example: "pending",
  });

export const UpdateShotDesignRequestSchema = z.object({
  camera_angle: CameraAngleSchema.optional(),
  shot_size: ShotSizeSchema.optional(),
  panel_type: PanelTypeSchema.optional(),
  shot_description: z.string().max(500).optional().openapi({
    description: "镜头描述",
  }),
  composition_hint: z.string().max(500).optional().openapi({
    description: "构图提示",
  }),
  character_ids: z.array(z.string().uuid()).optional().openapi({
    description: "关联角色 ID 列表",
  }),
  scene_id: z.string().uuid().nullable().optional().openapi({
    description: "关联场景 ID",
  }),
  expression_types: z.record(z.string()).optional().openapi({
    description: "角色表情配置（key: character_id, value: expression_type）",
  }),
  outfit_ids: z.record(z.string()).optional().openapi({
    description: "角色服装配置（key: character_id, value: outfit_id）",
  }),
  prompt: z.string().max(2000).optional().openapi({
    description: "AI 生成提示词",
  }),
  negative_prompt: z.string().max(1000).optional().openapi({
    description: "负面提示词",
  }),
  // 新增：角色身份证相关字段
  character_prompt_template_ids: z.array(z.string().uuid()).optional().openapi({
    description: "角色 Prompt 模板 ID 列表",
  }),
  character_prompt_status: ShotWorkflowStatusSchema.optional().openapi({
    description: "角色 Prompt 状态",
  }),
  final_prompt_status: ShotWorkflowStatusSchema.optional().openapi({
    description: "最终 Prompt 合成状态",
  }),
  nine_grid_status: ShotWorkflowStatusSchema.optional().openapi({
    description: "九宫格生成状态",
  }),
  selection_status: SelectionStatusSchema.optional().openapi({
    description: "图片选择状态",
  }),
});

export const GenerateShotImageRequestSchema = z.object({
  style_id: z.string().uuid().optional().openapi({
    description: "风格 ID（可选）",
  }),
  use_lora: z.boolean().optional().default(false).openapi({
    description: "是否使用 LoRA 模型",
    example: false,
  }),
});

export const UpdateTimelineConfigRequestSchema = z.object({
  title: z.string().min(1).max(200).optional().openapi({
    description: "时间线标题",
    example: "第一季剧本",
  }),
  status: z.enum(["draft", "generating", "completed", "error"]).optional().openapi({
    description: "时间线状态",
    example: "draft",
  }),
  config: z.object({
    auto_generate: z.boolean().optional().openapi({
      description: "是否自动生成",
      example: true,
    }),
    use_character_library: z.boolean().optional().openapi({
      description: "是否使用角色库",
      example: true,
    }),
    use_scene_library: z.boolean().optional().openapi({
      description: "是否使用场景库",
      example: true,
    }),
    default_comic_style_id: z.string().uuid().nullable().optional().openapi({
      description: "默认漫画风格 ID（null 表示未设置）",
      example: "550e8400-e29b-41d4-a716-446655440000",
    }),
    ai_model: z.enum(["gpt-4", "gpt-3.5-turbo"]).optional().openapi({
      description: "AI 模型选择",
      example: "gpt-4",
    }),
    shot_density: z.enum(["sparse", "medium", "dense"]).optional().openapi({
      description: "镜头密度",
      example: "medium",
    }),
    visual_style: z.enum(["manga", "realistic", "anime"]).optional().openapi({
      description: "视觉风格",
      example: "manga",
    }),
    language: z.enum(["zh-CN", "en-US"]).optional().openapi({
      description: "语言设置",
      example: "zh-CN",
    }),
  }).partial().optional().openapi({
    description: "时间线配置（部分更新）",
  }),
}).strict().openapi({
  description: "更新时间线配置请求",
});

// ============================================================================
// Response Schemas
// ============================================================================

export const TimelineChapterSchema = z.object({
  id: z.string().uuid(),
  timeline_id: z.string().uuid(),
  chapter_id: z.string().uuid().openapi({
    description: "关联的小说章节 ID",
  }),
  chapter_number: z.number().int(),
  script_status: z.string().openapi({
    description: "剧本状态（pending/generating/completed/error）",
    example: "completed",
  }),
  shot_status: z.string().openapi({
    description: "镜头状态",
    example: "pending",
  }),
  script_segment_count: z.number().int().openapi({
    description: "剧本片段数量",
    example: 15,
  }),
  shot_count: z.number().int().openapi({
    description: "镜头数量",
    example: 30,
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const TimelineResponseSchema = z.object({
  id: z.string().uuid(),
  novel_project_id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  config: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  chapters: z.array(TimelineChapterSchema).optional().openapi({
    description: "关联的章节列表",
  }),
});

export const CreateTimelineResponseSchema = z.object({
  success: z.boolean(),
  timeline: TimelineResponseSchema,
});

export const ListTimelinesResponseSchema = z.object({
  success: z.boolean(),
  timelines: z.array(TimelineResponseSchema),
});

export const ScriptSegmentSchema = z.object({
  id: z.string().uuid(),
  timeline_chapter_id: z.string().uuid(),
  segment_order: z.number().int().openapi({
    description: "片段顺序",
    example: 1,
  }),
  content: z.string().openapi({
    description: "片段内容",
  }),
  scene_description: z.string().nullable().openapi({
    description: "场景描述",
  }),
  character_actions: z.record(z.unknown()).nullable().openapi({
    description: "角色动作（JSON）",
  }),
  dialogue: z.record(z.unknown()).nullable().openapi({
    description: "对话内容（JSON）",
  }),
  estimated_duration: z.number().nullable().openapi({
    description: "预估时长（秒）",
    example: 5,
  }),
  emotion_tone: z.string().nullable().openapi({
    description: "情绪基调",
    example: "tense",
  }),
  source_text_start: z.number().int().openapi({
    description: "源文本起始位置",
  }),
  source_text_end: z.number().int().openapi({
    description: "源文本结束位置",
  }),
  created_at: z.string().datetime(),
});

export const GenerateScriptResponseSchema = z.object({
  success: z.boolean(),
  segments: z.array(ScriptSegmentSchema),
  metadata: z.object({
    segment_count: z.number().int(),
    duration_ms: z.number().int().openapi({
      description: "生成耗时（毫秒）",
    }),
  }),
});

export const ShotDesignSchema = z.object({
  id: z.string().uuid(),
  script_segment_id: z.string().uuid(),
  shot_order: z.number().int(),
  camera_angle: z.string().openapi({
    description: "摄像机角度",
  }),
  shot_size: z.string().openapi({
    description: "景别",
  }),
  panel_type: z.string().openapi({
    description: "分镜类型",
  }),
  shot_description: z.string().nullable(),
  composition_hint: z.string().nullable(),
  character_ids: z.array(z.string()).nullable().openapi({
    description: "关联角色 ID 列表",
  }),
  scene_id: z.string().uuid().nullable(),
  expression_types: z.record(z.string()).nullable(),
  outfit_ids: z.record(z.string()).nullable(),
  prompt: z.string().nullable(),
  negative_prompt: z.string().nullable(),
  generated_image_url: z.string().url().nullable().openapi({
    description: "生成的图片 URL",
  }),
  image_status: z.string().openapi({
    description: "图片生成状态（pending/generating/completed/error）",
    example: "pending",
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const GenerateShotsResponseSchema = z.object({
  success: z.boolean(),
  shots: z.array(ShotDesignSchema),
  metadata: z.object({
    shot_count: z.number().int(),
    duration_ms: z.number().int(),
  }),
});

export const UpdateShotDesignResponseSchema = z.object({
  success: z.boolean(),
  shot: ShotDesignSchema,
});

export const GenerateShotImageResponseSchema = z.object({
  success: z.boolean(),
  shot: ShotDesignSchema,
  task_id: z.string().uuid().optional().openapi({
    description: "异步任务 ID（如果异步生成）",
  }),
});

// ============================================================================
// Character Prompt Template Schemas (角色身份证)
// ============================================================================

export const CharacterPromptVersionSchema = z
  .enum(["base", "variant"])
  .openapi({
    description: "角色 Prompt 版本类型",
    example: "base",
  });

export const CharacterPositionHintSchema = z
  .enum(["left", "center", "right", "foreground", "background"])
  .openapi({
    description: "角色位置提示",
    example: "center",
  });

export const GenerateCharacterPromptRequestSchema = z.object({
  character_id: z.string().uuid().openapi({
    description: "角色 ID（关联 NovelCharacter 或 Character）",
  }),
  version: CharacterPromptVersionSchema.openapi({
    description: "版本类型: base = 基础版, variant = 变体版",
  }),
  variant_name: z.string().min(1).max(100).optional().openapi({
    description: "变体名称（仅 variant 版本需要）",
    example: "战斗装",
  }),
  user_guidance: z.string().max(500).optional().openapi({
    description: "用户补充的指导信息（可选）",
    example: "这个角色是一个魔法师，喜欢穿紫色的长袍",
  }),
}).refine(
  (data) => data.version === "base" || (data.version === "variant" && data.variant_name),
  { message: "变体版本必须提供 variant_name", path: ["variant_name"] }
);

export const UpdateCharacterPromptRequestSchema = z.object({
  appearance_prompt: z.string().max(2000).optional().openapi({
    description: "外貌描述（发型、脸型、身高、体型、肤色等）",
    example: "long silver hair, blue eyes, slender build, 170cm tall",
  }),
  clothing_prompt: z.string().max(2000).optional().openapi({
    description: "服装描述（款式、颜色、配饰等）",
    example: "white school uniform, blue tie, black skirt",
  }),
  style_prompt: z.string().max(500).optional().openapi({
    description: "画风描述",
    example: "manga style, black and white",
  }),
  characteristic_prompt: z.string().max(1000).optional().openapi({
    description: "特征标识（疤痕、纹身、特殊配饰等）",
    example: "scar on left cheek, silver earring",
  }),
  negative_prompt: z.string().max(1000).optional().openapi({
    description: "负面提示词",
    example: "blurry, low quality, deformed",
  }),
  reference_image_url: z.string().url().optional().openapi({
    description: "参考图 URL",
  }),
  is_active: z.boolean().optional().openapi({
    description: "是否启用",
  }),
});

export const CharacterPromptTemplateSchema = z.object({
  id: z.string().uuid(),
  character_id: z.string().uuid(),
  user_id: z.string().uuid(),
  version: CharacterPromptVersionSchema,
  variant_name: z.string().nullable(),
  appearance_prompt: z.string(),
  clothing_prompt: z.string(),
  style_prompt: z.string(),
  characteristic_prompt: z.string().nullable(),
  full_prompt: z.string(),
  negative_prompt: z.string(),
  reference_image_url: z.string().url().nullable(),
  is_active: z.boolean(),
  usage_count: z.number().int(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const GenerateCharacterPromptResponseSchema = z.object({
  success: z.boolean(),
  template: CharacterPromptTemplateSchema,
});

export const ListCharacterPromptsResponseSchema = z.object({
  success: z.boolean(),
  prompts: z.array(CharacterPromptTemplateSchema),
  character: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    image_url: z.string().url().nullable(),
  }).optional(),
});

export const UpdateCharacterPromptResponseSchema = z.object({
  success: z.boolean(),
  template: CharacterPromptTemplateSchema,
});

export const DeleteCharacterPromptResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ScriptStatus = z.infer<typeof ScriptStatusSchema>;
export type ShotStatus = z.infer<typeof ShotStatusSchema>;
export type CameraAngle = z.infer<typeof CameraAngleSchema>;
export type ShotSize = z.infer<typeof ShotSizeSchema>;
export type PanelType = z.infer<typeof PanelTypeSchema>;

export type CreateTimelineRequest = z.infer<typeof CreateTimelineRequestSchema>;
export type UpdateTimelineConfigRequest = z.infer<typeof UpdateTimelineConfigRequestSchema>;
export type GenerateScriptRequest = z.infer<typeof GenerateScriptRequestSchema>;
export type GenerateShotsRequest = z.infer<typeof GenerateShotsRequestSchema>;
export type UpdateShotDesignRequest = z.infer<typeof UpdateShotDesignRequestSchema>;
export type GenerateShotImageRequest = z.infer<typeof GenerateShotImageRequestSchema>;

export type TimelineChapter = z.infer<typeof TimelineChapterSchema>;
export type TimelineResponse = z.infer<typeof TimelineResponseSchema>;
export type CreateTimelineResponse = z.infer<typeof CreateTimelineResponseSchema>;
export type ListTimelinesResponse = z.infer<typeof ListTimelinesResponseSchema>;
export type ScriptSegment = z.infer<typeof ScriptSegmentSchema>;
export type GenerateScriptResponse = z.infer<typeof GenerateScriptResponseSchema>;
export type ShotDesign = z.infer<typeof ShotDesignSchema>;
export type GenerateShotsResponse = z.infer<typeof GenerateShotsResponseSchema>;
export type UpdateShotDesignResponse = z.infer<typeof UpdateShotDesignResponseSchema>;
export type GenerateShotImageResponse = z.infer<typeof GenerateShotImageResponseSchema>;

// Character Prompt Types
export type CharacterPromptVersion = z.infer<typeof CharacterPromptVersionSchema>;
export type CharacterPositionHint = z.infer<typeof CharacterPositionHintSchema>;
export type GenerateCharacterPromptRequest = z.infer<typeof GenerateCharacterPromptRequestSchema>;
export type UpdateCharacterPromptRequest = z.infer<typeof UpdateCharacterPromptRequestSchema>;
export type CharacterPromptTemplate = z.infer<typeof CharacterPromptTemplateSchema>;
export type GenerateCharacterPromptResponse = z.infer<typeof GenerateCharacterPromptResponseSchema>;
export type ListCharacterPromptsResponse = z.infer<typeof ListCharacterPromptsResponseSchema>;
export type UpdateCharacterPromptResponse = z.infer<typeof UpdateCharacterPromptResponseSchema>;
export type DeleteCharacterPromptResponse = z.infer<typeof DeleteCharacterPromptResponseSchema>;

// Shot Prompt Composition Types
export type ShotWorkflowStatus = z.infer<typeof ShotWorkflowStatusSchema>;
export type SelectionStatus = z.infer<typeof SelectionStatusSchema>;

// Compose Prompt Schemas
export const ComposePromptRequestSchema = z.object({
  character_template_ids: z.array(z.string().uuid()).openapi({
    description: "该分镜使用的角色 Prompt 模板 ID 列表",
  }),
  character_positions: z.record(
    CharacterPositionHintSchema
  ).optional().openapi({
    description: "角色位置提示 (key: character_id, value: position)",
  }),
  manual_adjustments: z.string().max(1000).optional().openapi({
    description: "用户手动补充的内容",
  }),
});

export const CharacterPromptRefSchema = z.object({
  character_id: z.string().uuid(),
  template_id: z.string().uuid(),
  position_hint: CharacterPositionHintSchema.optional(),
});

export const ShotPromptCompositionSchema = z.object({
  id: z.string().uuid(),
  shot_design_id: z.string().uuid(),
  user_id: z.string().uuid(),
  character_prompts: z.array(CharacterPromptRefSchema),
  scene_prompt: z.string(),
  action_prompt: z.string(),
  atmosphere_prompt: z.string(),
  camera_prompt: z.string(),
  final_prompt: z.string(),
  final_negative_prompt: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ComposePromptResponseSchema = z.object({
  success: z.boolean(),
  composition: ShotPromptCompositionSchema,
});

export type ComposePromptRequest = z.infer<typeof ComposePromptRequestSchema>;
export type CharacterPromptRef = z.infer<typeof CharacterPromptRefSchema>;
export type ShotPromptComposition = z.infer<typeof ShotPromptCompositionSchema>;
export type ComposePromptResponse = z.infer<typeof ComposePromptResponseSchema>;
