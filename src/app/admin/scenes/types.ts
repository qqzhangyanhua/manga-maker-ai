/**
 * Scene 管理模块类型定义
 */

import type { UserBrief } from "@/types/admin";

// ============================================================
// 数据模型类型
// ============================================================

/**
 * 场景数据模型
 */
export interface Scene {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  scene_type: string;
  image_url: string | null;
  tags: string[];
  prompt: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * 带用户信息的场景
 */
export interface SceneWithUser extends Scene {
  user?: UserBrief;
}

// ============================================================
// 过滤条件类型
// ============================================================

/**
 * 场景过滤条件
 */
export interface SceneFilter {
  [key: string]: string | undefined;
  keyword?: string;
  userId?: string;
  sceneType?: string;
}

// ============================================================
// 组件 Props 类型
// ============================================================

/**
 * 场景过滤栏 Props
 */
export interface SceneFilterBarProps {
  filter: SceneFilter;
  onFilterChange: (filter: SceneFilter) => void;
  users: UserBrief[];
  loading?: boolean;
}

/**
 * 场景表格 Props
 */
export interface SceneTableProps {
  scenes: SceneWithUser[];
  loading: boolean;
  onViewDetail: (scene: SceneWithUser) => void;
  onDelete: (scene: SceneWithUser) => void;
}

/**
 * 场景详情对话框 Props
 */
export interface SceneDetailDialogProps {
  open: boolean;
  scene: SceneWithUser | null;
  onOpenChange: (open: boolean) => void;
}

// ============================================================
// 常量定义
// ============================================================

/**
 * 场景类型选项
 */
export const SCENE_TYPES = [
  { value: "indoor", label: "室内" },
  { value: "outdoor", label: "室外" },
  { value: "urban", label: "城市" },
  { value: "nature", label: "自然" },
  { value: "fantasy", label: "奇幻" },
  { value: "scifi", label: "科幻" },
  { value: "historical", label: "历史" },
  { value: "abstract", label: "抽象" },
] as const;

/**
 * 获取场景类型标签
 */
export function getSceneTypeLabel(sceneType: string): string {
  const found = SCENE_TYPES.find((s) => s.value === sceneType);
  return found?.label || sceneType;
}
