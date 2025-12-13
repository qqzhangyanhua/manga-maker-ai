/**
 * Tag 管理模块类型定义
 */

// ============================================================
// 数据模型类型
// ============================================================

/**
 * 标签数据模型
 */
export interface Tag {
  id: string;
  name: string;
  type: string;
  category: string | null;
  created_by: string | null;
  usage_count: number;
  created_at: string;
}

/**
 * 标签表单数据
 */
export interface TagFormData {
  name: string;
  type: string;
  category: string;
}

// ============================================================
// 过滤条件类型
// ============================================================

/**
 * 标签过滤条件
 */
export interface TagFilter {
  [key: string]: string | undefined;
  keyword?: string;
  type?: string;
  category?: string;
}

// ============================================================
// 常量定义
// ============================================================

/**
 * 标签类型选项
 */
export const TAG_TYPES = [
  { value: "system", label: "系统标签" },
  { value: "user", label: "用户标签" },
] as const;

/**
 * 标签分类选项
 */
export const TAG_CATEGORIES = [
  { value: "style", label: "风格" },
  { value: "scene_type", label: "场景类型" },
  { value: "character_type", label: "角色类型" },
  { value: "mood", label: "情绪" },
  { value: "theme", label: "主题" },
] as const;

/**
 * 获取类型标签
 */
export function getTypeLabel(type: string): string {
  const found = TAG_TYPES.find((t) => t.value === type);
  return found?.label || type;
}

/**
 * 获取分类标签
 */
export function getCategoryLabel(category: string | null): string {
  if (!category) return "-";
  const found = TAG_CATEGORIES.find((c) => c.value === category);
  return found?.label || category;
}

/**
 * 空表单
 */
export function getEmptyForm(): TagFormData {
  return {
    name: "",
    type: "system",
    category: "",
  };
}
