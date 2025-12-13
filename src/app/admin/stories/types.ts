/**
 * Story 管理模块类型定义
 */

import type { UserBrief } from "@/types/admin";

// ============================================================
// 数据模型类型
// ============================================================

/**
 * 故事数据模型
 */
export interface Story {
  id: string;
  user_id: string;
  title: string;
  premise: string;
  genre: string;
  outline: Record<string, unknown>;
  characters: Record<string, unknown> | null;
  template_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  _count?: {
    projects: number;
    story_characters: number;
  };
}

/**
 * 带用户信息的故事
 */
export interface StoryWithUser extends Story {
  user?: UserBrief;
}

// ============================================================
// 过滤条件类型
// ============================================================

/**
 * 故事过滤条件
 */
export interface StoryFilter {
  [key: string]: string | undefined;
  keyword?: string;
  userId?: string;
  genre?: string;
  status?: string;
}

// ============================================================
// 常量定义
// ============================================================

/**
 * 故事类型选项
 */
export const STORY_GENRES = [
  { value: "suspense", label: "悬疑" },
  { value: "romance", label: "爱情" },
  { value: "adventure", label: "冒险" },
  { value: "scifi", label: "科幻" },
  { value: "daily", label: "日常" },
  { value: "fantasy", label: "奇幻" },
] as const;

/**
 * 故事状态选项
 */
export const STORY_STATUS = [
  { value: "draft", label: "草稿", color: "text-gray-600 bg-gray-50" },
  { value: "completed", label: "已完成", color: "text-green-600 bg-green-50" },
] as const;

/**
 * 获取类型标签
 */
export function getGenreLabel(genre: string): string {
  const found = STORY_GENRES.find((g) => g.value === genre);
  return found?.label || genre;
}

/**
 * 获取状态样式
 */
export function getStatusStyle(status: string): { label: string; color: string } {
  const found = STORY_STATUS.find((s) => s.value === status);
  return found || { label: status, color: "text-gray-600 bg-gray-50" };
}
