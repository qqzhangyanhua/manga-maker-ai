/**
 * 专题管理类型定义
 */

export interface Genre {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface GenreFormData {
  code: string;
  display_name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface GenreFilter {
  includeInactive?: boolean;
}

export function getEmptyForm(): GenreFormData {
  return {
    code: "",
    display_name: "",
    description: "",
    sort_order: 0,
    is_active: true,
  };
}
