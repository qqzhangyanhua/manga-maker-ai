/**
 * GeneratedImage 管理模块类型定义
 */

import type { UserBrief } from "@/types/admin";

// ============================================================
// 数据模型类型
// ============================================================

/**
 * 生成图片数据模型
 */
export interface GeneratedImage {
  id: string;
  user_id: string;
  image_url: string;
  prompt: string;
  style: string | null;
  source_type: string | null;
  source_id: string | null;
  character_id: string | null;
  generation_params: Record<string, unknown> | null;
  created_at: string;
}

/**
 * 带用户信息的生成图片
 */
export interface GeneratedImageWithUser extends GeneratedImage {
  user?: UserBrief;
}

// ============================================================
// 过滤条件类型
// ============================================================

/**
 * 生成图片过滤条件
 */
export interface GeneratedImageFilter {
  [key: string]: string | undefined;
  userId?: string;
  sourceType?: string;
  style?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================
// 组件 Props 类型
// ============================================================

/**
 * 图片过滤栏 Props
 */
export interface ImageFilterBarProps {
  filter: GeneratedImageFilter;
  onFilterChange: (filter: GeneratedImageFilter) => void;
  users: UserBrief[];
  loading?: boolean;
  selectedCount: number;
  onBatchDelete: () => void;
}

/**
 * 图片网格 Props
 */
export interface ImageGridProps {
  images: GeneratedImageWithUser[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onViewDetail: (image: GeneratedImageWithUser) => void;
  onDelete: (image: GeneratedImageWithUser) => void;
}

/**
 * 图片详情对话框 Props
 */
export interface ImageDetailDialogProps {
  open: boolean;
  image: GeneratedImageWithUser | null;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}

// ============================================================
// 常量定义
// ============================================================

/**
 * 来源类型选项
 */
export const SOURCE_TYPES = [
  { value: "panel", label: "分镜图片" },
  { value: "character", label: "角色图片" },
  { value: "pose", label: "姿势图片" },
  { value: "scene", label: "场景图片" },
  { value: "other", label: "其他" },
] as const;

/**
 * 风格选项
 */
export const STYLE_OPTIONS = [
  { value: "manga", label: "日式漫画" },
  { value: "american", label: "美式漫画" },
  { value: "webtoon", label: "韩式网漫" },
  { value: "realistic", label: "写实风格" },
] as const;

/**
 * 获取来源类型标签
 */
export function getSourceTypeLabel(sourceType: string | null): string {
  if (!sourceType) return "-";
  const found = SOURCE_TYPES.find((s) => s.value === sourceType);
  return found?.label || sourceType;
}

/**
 * 获取风格标签
 */
export function getStyleLabel(style: string | null): string {
  if (!style) return "-";
  const found = STYLE_OPTIONS.find((s) => s.value === style);
  return found?.label || style;
}
