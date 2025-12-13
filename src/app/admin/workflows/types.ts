/**
 * Workflow 管理模块类型定义
 */

import type { UserBrief } from "@/types/admin";

// ============================================================
// 数据模型类型
// ============================================================

/**
 * 工作流数据模型
 */
export interface Workflow {
  id: string;
  user_id: string;
  story_id: string | null;
  project_id: string | null;
  type: string;
  status: string;
  current_step: string | null;
  progress: number;
  config: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 带用户信息的工作流
 */
export interface WorkflowWithUser extends Workflow {
  user?: UserBrief;
}

// ============================================================
// 过滤条件类型
// ============================================================

/**
 * 工作流过滤条件
 */
export interface WorkflowFilter {
  [key: string]: string | undefined;
  userId?: string;
  type?: string;
  status?: string;
}

// ============================================================
// 常量定义
// ============================================================

/**
 * 工作流类型选项
 */
export const WORKFLOW_TYPES = [
  { value: "auto_generate", label: "自动生成" },
  { value: "manual", label: "手动" },
  { value: "batch", label: "批量处理" },
] as const;

/**
 * 工作流状态选项
 */
export const WORKFLOW_STATUS = [
  { value: "pending", label: "待处理", color: "text-gray-600 bg-gray-50" },
  { value: "running", label: "运行中", color: "text-blue-600 bg-blue-50" },
  { value: "completed", label: "已完成", color: "text-green-600 bg-green-50" },
  { value: "failed", label: "失败", color: "text-red-600 bg-red-50" },
  { value: "cancelled", label: "已取消", color: "text-orange-600 bg-orange-50" },
] as const;

/**
 * 工作流步骤选项
 */
export const WORKFLOW_STEPS = [
  { value: "story", label: "故事生成" },
  { value: "script", label: "脚本生成" },
  { value: "storyboard", label: "分镜生成" },
  { value: "images", label: "图片生成" },
  { value: "export", label: "导出" },
] as const;

/**
 * 获取类型标签
 */
export function getTypeLabel(type: string): string {
  const found = WORKFLOW_TYPES.find((t) => t.value === type);
  return found?.label || type;
}

/**
 * 获取状态样式
 */
export function getStatusStyle(status: string): { label: string; color: string } {
  const found = WORKFLOW_STATUS.find((s) => s.value === status);
  return found || { label: status, color: "text-gray-600 bg-gray-50" };
}

/**
 * 获取步骤标签
 */
export function getStepLabel(step: string | null): string {
  if (!step) return "-";
  const found = WORKFLOW_STEPS.find((s) => s.value === step);
  return found?.label || step;
}
