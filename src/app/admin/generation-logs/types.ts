/**
 * GenerationLog 管理模块类型定义
 */

import type { UserBrief } from "@/types/admin";

// ============================================================
// 数据模型类型
// ============================================================

/**
 * 生成日志数据模型
 */
export interface GenerationLog {
  id: string;
  user_id: string;
  project_id: string | null;
  action: string;
  provider_type: string | null;
  status: string;
  duration_ms: number | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

/**
 * 带用户信息的生成日志
 */
export interface GenerationLogWithUser extends GenerationLog {
  user?: UserBrief;
}

// ============================================================
// 过滤条件类型
// ============================================================

/**
 * 生成日志过滤条件
 */
export interface GenerationLogFilter {
  userId?: string;
  action?: string;
  status?: string;
  providerType?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================
// 组件 Props 类型
// ============================================================

/**
 * 日志过滤栏 Props
 */
export interface LogFilterBarProps {
  filter: GenerationLogFilter;
  onFilterChange: (filter: GenerationLogFilter) => void;
  users: UserBrief[];
  loading?: boolean;
}

/**
 * 日志表格 Props
 */
export interface LogTableProps {
  logs: GenerationLogWithUser[];
  loading: boolean;
  onViewDetail: (log: GenerationLogWithUser) => void;
}

/**
 * 日志详情对话框 Props
 */
export interface LogDetailDialogProps {
  open: boolean;
  log: GenerationLogWithUser | null;
  onOpenChange: (open: boolean) => void;
}

// ============================================================
// 常量定义
// ============================================================

/**
 * 操作类型选项
 */
export const LOG_ACTIONS = [
  { value: "generate_character_view", label: "角色视图生成" },
  { value: "generate_expression", label: "表情生成" },
  { value: "generate_similar_character", label: "相似角色生成" },
  { value: "story_generation", label: "故事生成" },
  { value: "panel_generation", label: "分镜图片生成" },
  { value: "prompt_optimize", label: "提示词优化" },
  { value: "script_analyze", label: "脚本分析" },
] as const;

/**
 * 状态选项
 */
export const LOG_STATUS = [
  { value: "success", label: "成功", color: "text-green-600 bg-green-50" },
  { value: "failed", label: "失败", color: "text-red-600 bg-red-50" },
] as const;

/**
 * Provider 类型选项
 */
export const PROVIDER_TYPES = [
  { value: "script_analyzer", label: "脚本分析器" },
  { value: "prompt_optimizer", label: "提示词优化器" },
  { value: "style_generator", label: "风格生成器" },
  { value: "character_analyzer", label: "角色分析器" },
  { value: "image_generation", label: "图片生成" },
  { value: "story_generator", label: "故事生成器" },
] as const;

/**
 * 获取操作类型标签
 */
export function getActionLabel(action: string): string {
  const found = LOG_ACTIONS.find((a) => a.value === action);
  return found?.label || action;
}

/**
 * 获取状态样式
 */
export function getStatusStyle(status: string): { label: string; color: string } {
  const found = LOG_STATUS.find((s) => s.value === status);
  return found || { label: status, color: "text-gray-600 bg-gray-50" };
}

/**
 * 获取 Provider 类型标签
 */
export function getProviderTypeLabel(providerType: string): string {
  const found = PROVIDER_TYPES.find((p) => p.value === providerType);
  return found?.label || providerType;
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
