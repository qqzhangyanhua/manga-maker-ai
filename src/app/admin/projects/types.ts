/**
 * Project 管理模块类型定义
 */

import type { UserBrief } from "@/types/admin";

// ============================================================
// 数据模型类型
// ============================================================

/**
 * 项目数据模型
 */
export interface Project {
  id: string;
  user_id: string;
  story_id: string | null;
  title: string;
  description: string | null;
  style: string | null;
  status: string;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  _count?: {
    panels: number;
  };
}

/**
 * 带用户信息的项目
 */
export interface ProjectWithUser extends Project {
  user?: UserBrief;
}

// ============================================================
// 过滤条件类型
// ============================================================

/**
 * 项目过滤条件
 */
export interface ProjectFilter {
  [key: string]: string | undefined;
  keyword?: string;
  userId?: string;
  status?: string;
}

// ============================================================
// 常量定义
// ============================================================

/**
 * 项目状态选项
 */
export const PROJECT_STATUS = [
  { value: "draft", label: "草稿", color: "text-gray-600 bg-gray-50" },
  { value: "in_progress", label: "进行中", color: "text-blue-600 bg-blue-50" },
  { value: "completed", label: "已完成", color: "text-green-600 bg-green-50" },
] as const;

/**
 * 获取状态样式
 */
export function getStatusStyle(status: string): { label: string; color: string } {
  const found = PROJECT_STATUS.find((s) => s.value === status);
  return found || { label: status, color: "text-gray-600 bg-gray-50" };
}
