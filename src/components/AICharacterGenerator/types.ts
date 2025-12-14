/**
 * AI角色生成器类型定义
 */

import type { CharacterRole } from "@/components/StoryCharacter/types";

/**
 * 对话框阶段
 */
export type DialogStage = "idle" | "generating" | "preview" | "saving";

/**
 * 生成的角色数据
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
