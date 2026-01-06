/**
 * AI角色生成器类型定义
 */

import type { CharacterRole } from "@/components/StoryCharacter/types";
import type { SuggestedCharacterResponse } from "@/types/suggested-characters.types";

/**
 * 对话框阶段
 */
export type DialogStage =
  | "idle" // 初始状态
  | "analyzing" // 第一步：分析角色中
  | "preview_list" // 预览建议角色（无图）
  | "generating" // 第二步：生成图片中
  | "preview" // 预览生成结果（有图）- 保留向后兼容
  | "saving"; // 保存中

/**
 * 生成的角色数据（旧格式，保留向后兼容）
 */
export interface GeneratedCharacter {
  name: string;
  description: string;
  appearance: string;
  role: CharacterRole;
  image_base64: string;
  optimized_prompt: string;
}

/**
 * 故事上下文
 */
export interface StoryContext {
  title: string;
  premise: string;
  genre: string;
}

/**
 * 生成进度
 */
export interface GenerationProgress {
  total: number;
  completed: number;
  failed: number;
  current_id?: string; // Changed from current_temp_id
}

// 导出 SuggestedCharacterResponse 类型，方便其他组件使用
export type { SuggestedCharacterResponse as SuggestedCharacter };
