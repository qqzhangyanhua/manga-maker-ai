/**
 * 核心领域类型定义
 * 统一管理剧本编辑器相关的所有类型
 * 
 * 注意: 部分类型从 Prisma 和现有类型系统导入,避免重复定义
 */

import type { StoryCharacter as PrismaStoryCharacter } from '@prisma/client';
import type { StoryCharacterWithDetails as ImportedStoryCharacterWithDetails } from '@/components/StoryCharacter/types';

// ==================== 基础实体类型 ====================

export interface Chapter {
  id: string;
  title: string;
  chapter_order: number;
  summary?: string | null;
  content?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown; // 添加索引签名以兼容 useProgressCalculation
}

export interface Panel {
  id: string;
  chapter_id?: string; // 可选,与 script-editor.types.ts 保持一致
  panel_order: number;
  description: string;
  visual_prompt: string;
  panel_type?: string;
  importance?: string;
  camera_angle?: string;
  shot_size?: string;
  dialogue?: string;
  character_name?: string;
  emotion?: string;
  generated_image?: string;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown; // 添加索引签名以兼容 useProgressCalculation
}

export interface Story {
  id: string;
  title: string;
  premise?: string | null;
  comic_style_id?: string | null;
  style_reference_image?: string | null;
  source_novel_id?: string | null;
  suggested_characters?: SuggestedCharacter[];
  style?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SuggestedCharacter {
  name: string;
  role: string;
  description?: string;
}

// ==================== 角色相关类型 ====================

// 重新导出以便统一使用
export type StoryCharacter = PrismaStoryCharacter;
export type StoryCharacterWithDetails = ImportedStoryCharacterWithDetails;

export interface CharacterAsset {
  id: string;
  name: string;
  base_image_url?: string | null; // 改为可选,与实际 API 返回一致
  description?: string | null;
  comic_style?: ComicStyle | null;
  created_at?: string;
  updated_at?: string;
}

export interface CharacterWithAssets {
  id: string;
  name?: string; // 改为可选,修复类型错误
  base_image_url?: string | null;
  description?: string | null;
  comic_style?: ComicStyle | null;
}

// ==================== 风格相关类型 ====================

export interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  prompt_prefix?: string | null;
  image_url?: string | null;
  enabled?: boolean;
}

// ==================== 小说来源相关类型 ====================

export interface SourceNovelInfo {
  id: string;
  title: string;
  author?: string | null;
  description?: string | null;
  cover_image?: string | null;
}

// ==================== 表单数据类型 ====================

export interface StoryFormData {
  title: string;
  premise: string;
  comic_style_id?: string | null;
  style_reference_image?: string | null;
}

// ==================== 进度统计类型 ====================

export interface ProgressStats {
  totalChapters: number;
  completedChapters: number;
  totalPanels: number;
  completedPanels: number;
  completionRate: number;
  stage: 'empty' | 'chapter_created' | 'in_progress' | 'completed' | 'generating'; // 添加 generating 状态
}

// ==================== 生成相关类型 ====================

export interface GenerationProgress {
  currentPanel: number;
  totalPanels: number;
  generatedPanels: Panel[];
  status: 'idle' | 'generating' | 'completed' | 'error';
  error?: string;
}

// ==================== 背景生成参数 ====================

export interface BackgroundGenerationParams {
  scene_type: string;
  style: string;
  prompt?: string;
  negative_prompt?: string;
}

// 输入验证后的参数
export interface ValidatedBackgroundParams extends BackgroundGenerationParams {
  prompt: string;
  negative_prompt: string;
}
