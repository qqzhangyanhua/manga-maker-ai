/**
 * 管理后台通用类型定义
 *
 * 遵循原则：
 * 1. 零 any 类型
 * 2. 类型与业务代码分离
 * 3. 泛型优先，提高复用性
 */

// ============================================================
// API 响应类型
// ============================================================

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * 分页响应数据
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 分页 API 响应
 */
export interface PaginatedResponse<T> extends ApiResponse<PaginatedData<T>> {
  data: PaginatedData<T>;
}

// ============================================================
// 分页与过滤类型
// ============================================================

/**
 * 基础分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * 基础过滤参数
 */
export interface BaseFilterParams {
  keyword?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * 排序参数
 */
export interface SortParams {
  sort?: string;
  order?: "asc" | "desc";
}

/**
 * 完整查询参数
 */
export type QueryParams<F extends Record<string, unknown> = Record<string, unknown>> =
  PaginationParams & SortParams & F;

// ============================================================
// 对话框状态类型
// ============================================================

/**
 * 删除确认对话框状态
 */
export interface DeleteDialogState<T> {
  open: boolean;
  item: T | null;
  loading: boolean;
}

/**
 * 表单对话框状态
 */
export interface FormDialogState<T, F> {
  open: boolean;
  editing: T | null;
  form: F;
  submitting: boolean;
}

/**
 * 详情对话框状态
 */
export interface DetailDialogState<T> {
  open: boolean;
  item: T | null;
}

// ============================================================
// 通用组件 Props 类型
// ============================================================

/**
 * 删除确认对话框 Props
 */
export interface AdminDeleteDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

/**
 * 分页控制 Props
 */
export interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

/**
 * 空状态 Props
 */
export interface AdminEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// ============================================================
// 列表 Hook 返回类型
// ============================================================

/**
 * 列表 Hook 返回值
 */
export interface UseAdminListReturn<T, F extends Record<string, unknown> = Record<string, unknown>> {
  items: T[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filter: F;
  setFilter: (filter: F) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  refetch: () => Promise<void>;
}

/**
 * 表单 Hook 返回值
 */
export interface UseAdminFormReturn<T, F> {
  form: F;
  setForm: React.Dispatch<React.SetStateAction<F>>;
  editing: T | null;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  submitting: boolean;
  handleOpenCreate: () => void;
  handleOpenEdit: (item: T) => void;
  handleSubmit: () => Promise<void>;
  handleDelete: (item: T) => Promise<void>;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  deletingItem: T | null;
  deleting: boolean;
}

// ============================================================
// 用户相关类型（管理后台通用）
// ============================================================

/**
 * 用户简要信息（用于关联显示）
 */
export interface UserBrief {
  id: string;
  email: string;
  name: string | null;
}

/**
 * 用户映射表
 */
export type UserMap = Record<string, UserBrief>;

// ============================================================
// 通用状态常量
// ============================================================

/**
 * 通用状态选项
 */
export const STATUS_OPTIONS = [
  { value: "success", label: "成功", color: "text-green-600" },
  { value: "failed", label: "失败", color: "text-red-600" },
  { value: "pending", label: "待处理", color: "text-yellow-600" },
  { value: "processing", label: "处理中", color: "text-blue-600" },
  { value: "cancelled", label: "已取消", color: "text-gray-600" },
] as const;

export type StatusType = typeof STATUS_OPTIONS[number]["value"];

/**
 * 每页数量选项
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type PageSizeType = typeof PAGE_SIZE_OPTIONS[number];

// ============================================================
// 工具类型
// ============================================================

/**
 * 将对象类型的所有属性变为可选
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 提取数组元素类型
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * 排除 null 和 undefined
 */
export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};
