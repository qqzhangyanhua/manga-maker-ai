/**
 * 管理后台通用 Hooks 导出
 */

export { useAdminList } from "./use-admin-list";
export type { UseAdminListOptions, UseAdminListReturn } from "./use-admin-list";

export { useAdminForm, createFieldHandler, createSelectHandler } from "./use-admin-form";
export type {
  FormMode,
  FieldRule,
  FormRules,
  FormErrors,
  UseAdminFormOptions,
  UseAdminFormReturn,
} from "./use-admin-form";
