/**
 * 建议角色相关的类型定义
 * 用于两步角色生成流程
 */

import type { CharacterRole } from "@/components/StoryCharacter/types";

/**
 * Story.suggested_characters 字段的数据结构
 */
export interface SuggestedCharactersData {
  version: string; // "1.0"
  generated_at: string; // ISO 8601 timestamp
  characters: SuggestedCharacter[];
  comic_style_id: string | null;
  settings: {
    count: number;
    temperature: number;
  };
}

/**
 * 单个建议角色的数据结构
 */
export interface SuggestedCharacter {
  temp_id: string; // 临时ID，格式: "temp_{uuid}"
  name: string; // 角色名字
  description: string; // 中文，50-120字
  appearance: string; // 英文，用于AI绘画
  role: CharacterRole; // protagonist | antagonist | supporting | minor
  generated: boolean; // 是否已生成图片
  character_id: string | null; // 生成图片后的 Character ID
  generated_at?: string; // 图片生成时间
  image_url?: string; // 图片URL（可选，用于快速预览）
  optimized_prompt?: string; // 优化后的提示词
}
