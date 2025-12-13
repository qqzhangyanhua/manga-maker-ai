/**
 * GenerationTask 管理模块类型定义
 */

import type { UserBrief } from "@/types/admin";

// ============================================================
// 数据模型类型
// ============================================================

/**
 * 生成任务数据模型
 */
export interface GenerationTask {
  id: string;
  user_id: string;
  project_id: string;
  panel_ids: string[];
  task_type: string;
  status: string;
  progress: number;
  current_panel_index: number;
  settings: Record<string, unknown>;
  error_logs: Array<{ panelId: string; error: string; timestamp: string }> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * 带用户信息的生成任务
 */
export interface GenerationTaskWithUser extends GenerationTask {
  user?: UserBrief;
}

// ============================================================
// 过滤条件类型
// ============================================================

/**
 * 生成任务过滤条件
 */
export interface GenerationTaskFilter {
  [key: string]: string | undefined;
  userId?: string;
  taskType?: string;
  status?: string;
}

// ============================================================
// 常量定义
// ============================================================

/**
 * 任务类型选项
 */
export const TASK_TYPES = [
  { value: "batch", label: "批量生成" },
  { value: "variant", label: "变体生成" },
] as const;

/**
 * 任务状态选项
 */
export const TASK_STATUS = [
  { value: "pending", label: "待处理", color: "text-gray-600 bg-gray-50" },
  { value: "processing", label: "处理中", color: "text-blue-600 bg-blue-50" },
  { value: "completed", label: "已完成", color: "text-green-600 bg-green-50" },
  { value: "failed", label: "失败", color: "text-red-600 bg-red-50" },
  { value: "cancelled", label: "已取消", color: "text-orange-600 bg-orange-50" },
] as const;

/**
 * 获取类型标签
 */
export function getTaskTypeLabel(type: string): string {
  const found = TASK_TYPES.find((t) => t.value === type);
  return found?.label || type;
}

/**
 * 获取状态样式
 */
export function getStatusStyle(status: string): { label: string; color: string } {
  const found = TASK_STATUS.find((s) => s.value === status);
  return found || { label: status, color: "text-gray-600 bg-gray-50" };
}
