/**
 * 角色身份证与九宫格工作流类型定义
 * 
 * 用于小说转漫画工作流的新系统：
 * 1. CharacterPromptTemplate - 角色身份证 Prompt 模板
 * 2. ShotPromptComposition - 分镜 Prompt 合成记录
 * 3. NineGridGeneration - 九宫格生成记录
 */

// ============================================================
// 角色身份证 Prompt 模板
// ============================================================

/** 角色 Prompt 版本类型 */
export type CharacterPromptVersion = "base" | "variant";

/** 角色 Prompt 模板基础接口 */
export interface CharacterPromptTemplate {
  id: string;
  character_id: string;
  user_id: string;
  
  /** 版本类型: base = 基础版, variant = 变体版 */
  version: CharacterPromptVersion;
  /** 变体名称（仅 variant 版本需要，如 "战斗装", "正装", "休闲装"） */
  variant_name?: string | null;
  
  // Prompt 组成部分
  /** 外貌描述（发型、脸型、身高、体型、肤色等） */
  appearance_prompt: string;
  /** 服装描述（款式、颜色、配饰等） */
  clothing_prompt: string;
  /** 画风描述（manga style, anime style, realistic 等） */
  style_prompt: string;
  /** 特征标识（疤痕、纹身、特殊配饰等，可选） */
  characteristic_prompt?: string | null;
  
  // 合成结果
  /** 拼接后的完整提示词 */
  full_prompt: string;
  /** 负面提示词 */
  negative_prompt: string;
  
  // 元数据
  /** 参考图 URL（可选，用于 ControlNet） */
  reference_image_url?: string | null;
  /** 是否启用 */
  is_active: boolean;
  /** 使用次数统计 */
  usage_count: number;
  
  created_at: string;
  updated_at: string;
}

/** 创建角色 Prompt 模板的请求参数 */
export interface CreateCharacterPromptTemplateInput {
  character_id: string;
  version: CharacterPromptVersion;
  variant_name?: string;
  appearance_prompt: string;
  clothing_prompt: string;
  style_prompt: string;
  characteristic_prompt?: string;
  negative_prompt?: string;
  reference_image_url?: string;
}

/** 更新角色 Prompt 模板的请求参数 */
export interface UpdateCharacterPromptTemplateInput {
  appearance_prompt?: string;
  clothing_prompt?: string;
  style_prompt?: string;
  characteristic_prompt?: string;
  negative_prompt?: string;
  reference_image_url?: string;
  is_active?: boolean;
}

/** AI 生成角色 Prompt 的请求参数 */
export interface GenerateCharacterPromptInput {
  character_id: string;
  version: CharacterPromptVersion;
  variant_name?: string;
  user_guidance?: string; // 用户补充的指导（可选）
}

/** AI 生成角色 Prompt 的响应 */
export interface GenerateCharacterPromptResponse {
  appearance_prompt: string;
  clothing_prompt: string;
  style_prompt: string;
  characteristic_prompt: string;
  negative_prompt: string;
}

// ============================================================
// 分镜 Prompt 合成记录
// ============================================================

/** 角色位置提示 */
export type CharacterPositionHint = 
  | "left" 
  | "center" 
  | "right" 
  | "foreground" 
  | "background";

/** 分镜中使用的角色 Prompt 引用 */
export interface ShotCharacterPromptRef {
  character_id: string;
  template_id: string;
  position_hint?: CharacterPositionHint;
}

/** 分镜 Prompt 合成记录 */
export interface ShotPromptComposition {
  id: string;
  shot_design_id: string;
  user_id: string;
  
  /** 该分镜使用的角色 Prompt 引用列表 */
  character_prompts: ShotCharacterPromptRef[];
  
  // Prompt 组成部分
  /** 场景/背景描述 */
  scene_prompt: string;
  /** 动作描述 */
  action_prompt: string;
  /** 氛围描述（lighting, mood, weather） */
  atmosphere_prompt: string;
  /** 相机参数（angle, shot_size） */
  camera_prompt: string;
  
  // 合成结果
  /** 组合后的完整提示词 */
  final_prompt: string;
  /** 负面提示词 */
  final_negative_prompt: string;
  
  created_at: string;
  updated_at: string;
}

/** 创建分镜 Prompt 合成的请求参数 */
export interface ComposeShotPromptInput {
  shot_design_id: string;
  character_template_ids: string[];
  character_positions?: Record<string, CharacterPositionHint>;
  manual_adjustments?: string;
}

// ============================================================
// 九宫格生成记录
// ============================================================

/** 九宫格生成状态 */
export type NineGridStatus = "pending" | "generating" | "completed" | "error";

/** 分镜选择状态 */
export type ShotSelectionStatus = "pending" | "selected" | "refined";

/** 九宫格中的单张图片 */
export interface NineGridImage {
  /** 位置 (1-9) */
  grid_position: number;
  /** 图片 URL */
  image_url: string;
  /** 随机种子 */
  seed: number;
  /** 其他元数据 */
  metadata?: Record<string, unknown>;
}

/** 九宫格生成参数 */
export interface NineGridGenerationParams {
  width: number;
  height: number;
  steps?: number;
  cfg_scale?: number;
  seed?: number;
}

/** 九宫格生成记录 */
export interface NineGridGeneration {
  id: string;
  shot_design_id: string;
  prompt_composition_id: string;
  user_id: string;
  
  /** 生成参数 */
  generation_params: NineGridGenerationParams;
  
  /** 九宫格图片列表 */
  images: NineGridImage[];
  
  /** 用户选择的位置 (1-9) */
  selected_grid_position?: number | null;
  /** 选中的图片 URL */
  selected_image_url?: string | null;
  
  /** 生成状态 */
  status: NineGridStatus;
  /** 错误信息（如果有） */
  error_message?: string | null;
  
  created_at: string;
  completed_at?: string | null;
}

/** 生成九宫格的请求参数 */
export interface GenerateNineGridInput {
  shot_design_id: string;
  prompt_composition_id: string;
  generation_params?: Partial<NineGridGenerationParams>;
}

/** 选择九宫格图片的请求参数 */
export interface SelectNineGridImageInput {
  nine_grid_id: string;
  grid_position: number; // 1-9
}

/** 微调 Prompt 并重新生成的请求参数 */
export interface RefinePromptInput {
  shot_design_id: string;
  refined_prompt: string;
  generation_params?: Partial<NineGridGenerationParams>;
}

// ============================================================
// 增强的 ShotDesign 类型（包含新字段）
// ============================================================

/** Prompt 生成状态 */
export type PromptGenerationStatus = "pending" | "generating" | "completed" | "error";

/** 增强的 ShotDesign（包含角色身份证和九宫格相关字段） */
export interface EnhancedShotDesign {
  id: string;
  script_segment_id: string;
  shot_order: number;
  
  // 镜头参数
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  
  // 内容描述
  shot_description: string;
  composition_hint: string;
  location_key: string;
  
  // 资产绑定
  character_ids: string[];
  scene_id?: string | null;
  expression_types: string[];
  outfit_ids: string[];
  
  // 原有 Prompt 字段
  prompt: string;
  negative_prompt?: string | null;
  generated_image_url?: string | null;
  generation_status: string;
  
  // 新增: 角色身份证相关
  character_prompt_template_ids: string[];
  prompt_composition_id?: string | null;
  nine_grid_generation_id?: string | null;
  
  // 新增: 生成状态细化
  character_prompt_status: PromptGenerationStatus;
  final_prompt_status: PromptGenerationStatus;
  nine_grid_status: NineGridStatus;
  selection_status: ShotSelectionStatus;
  
  created_at: string;
  
  // Relations (可选，根据查询 include 决定)
  prompt_composition?: ShotPromptComposition | null;
  nine_grid?: NineGridGeneration | null;
}

// ============================================================
// SSE 事件类型（用于九宫格生成的流式响应）
// ============================================================

/** 九宫格生成进度事件 */
export interface NineGridProgressEvent {
  event: "progress";
  data: {
    current: number; // 当前生成到第几张 (1-9)
    total: 9;
    status: "generating";
  };
}

/** 九宫格单张图片生成完成事件 */
export interface NineGridImageEvent {
  event: "image";
  data: {
    grid_position: number;
    image_url: string;
    seed: number;
  };
}

/** 九宫格生成完成事件 */
export interface NineGridCompletedEvent {
  event: "completed";
  data: {
    nine_grid_generation_id: string;
    images: NineGridImage[];
  };
}

/** 九宫格生成错误事件 */
export interface NineGridErrorEvent {
  event: "error";
  data: {
    message: string;
  };
}

/** 九宫格 SSE 事件联合类型 */
export type NineGridSSEEvent = 
  | NineGridProgressEvent 
  | NineGridImageEvent 
  | NineGridCompletedEvent 
  | NineGridErrorEvent;

// ============================================================
// 工具函数类型
// ============================================================

/** 拼接角色 Prompt 的各部分 */
export function buildFullPrompt(template: Partial<CharacterPromptTemplate>): string {
  const parts: string[] = [];
  
  if (template.appearance_prompt) {
    parts.push(template.appearance_prompt);
  }
  if (template.clothing_prompt) {
    parts.push(template.clothing_prompt);
  }
  if (template.characteristic_prompt) {
    parts.push(template.characteristic_prompt);
  }
  if (template.style_prompt) {
    parts.push(template.style_prompt);
  }
  
  return parts.join(", ");
}

/** 预设的画风选项 */
export const STYLE_PRESETS = [
  { value: "manga style, black and white", label: "日式漫画风格" },
  { value: "anime style, vibrant colors", label: "动漫风格" },
  { value: "semi-realistic, detailed", label: "半写实风格" },
  { value: "webtoon style, digital art", label: "韩漫风格" },
  { value: "watercolor style, soft colors", label: "水彩风格" },
  { value: "realistic, photorealistic", label: "写实风格" },
] as const;

/** 预设的变体类型选项 */
export const VARIANT_PRESETS = [
  { value: "战斗装", label: "战斗装" },
  { value: "正装", label: "正装" },
  { value: "休闲装", label: "休闲装" },
  { value: "校服", label: "校服" },
  { value: "睡衣", label: "睡衣" },
  { value: "泳装", label: "泳装" },
  { value: "运动装", label: "运动装" },
  { value: "古装", label: "古装" },
] as const;

/** 默认的负面提示词 */
export const DEFAULT_NEGATIVE_PROMPT = 
  "blurry, low quality, deformed, extra limbs, bad anatomy, disfigured, " +
  "poorly drawn face, mutation, mutated, ugly, out of frame, duplicate, " +
  "watermark, signature, text";
