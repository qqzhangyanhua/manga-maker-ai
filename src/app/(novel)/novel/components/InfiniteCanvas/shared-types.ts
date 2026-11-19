/**
 * Infinite Canvas 共享类型定义
 * 
 * 包含跨多个组件共享的业务数据类型
 */

/**
 * 漫画风格定义
 */
export interface ComicStyle {
  id: string;
  name: string;
  description?: string;
}

/**
 * 章节角色定义
 */
export interface ChapterCharacter {
  id: string;
  name: string;
  description?: string;
  role?: string;
  image_url?: string;
  base_image_url?: string | null;
  reference_image?: string | null;
}

/**
 * 小说角色定义
 */
export interface NovelCharacter {
  id: string;
  name: string;
  description?: string;
  appearance?: string;
  personality?: string;
  role?: string;
  image_url?: string;
}

/**
 * 角色来源类型
 */
export type CharacterSource = "novel" | "chapter" | "asset";

/**
 * 可选角色定义
 */
export interface SelectableCharacter {
  id: string;
  name: string;
  description?: string;
  role?: string;
  image_url?: string;
  source: CharacterSource;
  isSelected: boolean;
}

/**
 * 角色资产状态
 */
export interface CharacterAssetStatus {
  id: string;
  name: string;
  hasAsset: boolean;
  assetId?: string;
  assetImageUrl?: string;
}

/**
 * 分镜图片角色输入
 */
export interface ShotImageCharacterInput {
  name: string;
  role: string;
  description: string;
  tempId: string;
  reference_image_url?: string;
}

/**
 * 九宫格图片类型
 */
export interface NineGridImage {
  grid_position: number;
  image_url: string;
  seed: number;
}

/**
 * SSE 进度事件
 */
export interface ProgressEvent {
  current: number;
  total: number;
  status: string;
}

/**
 * SSE 图片事件
 */
export interface ImageEvent {
  grid_position: number;
  image_url: string;
  seed: number;
}

/**
 * SSE 完成事件
 */
export interface CompletedEvent {
  nine_grid_generation_id: string;
  images: NineGridImage[];
  total_generated: number;
}

/**
 * 带 Prompt 的角色
 */
export interface CharacterWithPrompts {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  prompts: Array<{
    id: string;
    version: "base" | "variant";
    variant_name?: string;
    full_prompt: string;
  }>;
}

/**
 * Prompt 信息（基础版）
 */
export interface PromptInfo {
  id: string;
  full_prompt: string;
  visual_elements?: string;
  style_tags?: string;
}

/**
 * Prompt 信息（详细版，用于 PromptRefineDialog）
 */
export interface PromptInfoDetailed {
  current_prompt: string;
  negative_prompt: string;
  description: string;
  current_image_url: string | null;
  selected_nine_grid_image: {
    grid_position: number;
    image_url: string;
    seed: number;
  } | null;
  composition_id: string | null;
}

/**
 * 图片生成参数
 */
export interface GenerationParams {
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  seed?: number;
}

/**
 * 漫画风格（完整版，包含 API 返回的所有字段）
 */
export interface ComicStyleFull {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  image_url: string | null;
  tag_color: string;
  prompt_prefix: string | null;
}

/**
 * 章节角色（完整版，包含 API 返回的所有字段）
 */
export interface ChapterCharacterFull {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
  reference_image: string | null;
  shot_count?: number;
  asset_status?: CharacterAssetStatusFull;
}

/**
 * 角色资产状态（完整版）
 */
export interface CharacterAssetStatusFull {
  has_reference: boolean;
  has_base_image: boolean;
  has_views: boolean;
  has_expressions: boolean;
  has_outfits: boolean;
  ready_for_generation: boolean;
  missing_assets: string[];
}

/**
 * 小说角色（用于对话框输入）
 */
export interface NovelCharacterInput {
  name: string;
  role: string;
  description: string;
  tempId: string;
  generatedImageUrl?: string;
}

/**
 * 可选角色（用于对话框选择）
 */
export interface SelectableCharacterInput {
  id: string;
  name: string;
  role: string;
  description: string;
  imageUrl: string | null;
  source: CharacterSource;
}

/**
 * 生成中的章节
 */
export interface GeneratingChapter {
  chapterId: string;
  chapterNumber: number;
  title: string;
  type: "script" | "shot" | "scene" | "final";
  progress: number;
  current: number;
  total: number;
}
