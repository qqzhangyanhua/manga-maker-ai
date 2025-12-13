/**
 * 通用管理后台表单 Hook
 *
 * 提供表单状态管理、提交处理、验证等功能
 */

import { useState, useCallback, useMemo } from "react";

// ============================================================
// 类型定义
// ============================================================

/**
 * 表单模式
 */
export type FormMode = "create" | "edit";

/**
 * 字段验证规则
 */
export interface FieldRule<T> {
  required?: boolean;
  message?: string;
  validate?: (value: T[keyof T], form: T) => string | undefined;
}

/**
 * 表单验证规则
 */
export type FormRules<T> = {
  [K in keyof T]?: FieldRule<T>;
};

/**
 * 表单错误
 */
export type FormErrors<T> = {
  [K in keyof T]?: string;
};

/**
 * Hook 配置选项
 */
export interface UseAdminFormOptions<T extends Record<string, unknown>> {
  /** 初始表单数据 */
  initialData: T;
  /** 验证规则 */
  rules?: FormRules<T>;
  /** 提交处理函数 */
  onSubmit?: (data: T, mode: FormMode) => Promise<void>;
  /** 提交成功回调 */
  onSuccess?: () => void;
  /** 提交失败回调 */
  onError?: (error: Error) => void;
}

/**
 * Hook 返回值
 */
export interface UseAdminFormReturn<T extends Record<string, unknown>> {
  /** 表单数据 */
  form: T;
  /** 表单模式 */
  mode: FormMode;
  /** 是否正在提交 */
  submitting: boolean;
  /** 表单错误 */
  errors: FormErrors<T>;
  /** 表单是否被修改 */
  isDirty: boolean;
  /** 设置单个字段值 */
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  /** 设置多个字段值 */
  setFields: (fields: Partial<T>) => void;
  /** 重置表单到初始状态 */
  reset: () => void;
  /** 重置表单到指定数据（用于编辑模式） */
  resetTo: (data: T, mode?: FormMode) => void;
  /** 验证表单 */
  validate: () => boolean;
  /** 验证单个字段 */
  validateField: <K extends keyof T>(field: K) => boolean;
  /** 清除错误 */
  clearErrors: () => void;
  /** 清除单个字段错误 */
  clearFieldError: <K extends keyof T>(field: K) => void;
  /** 提交表单 */
  submit: () => Promise<void>;
  /** 设置提交状态（用于外部控制） */
  setSubmitting: (submitting: boolean) => void;
}

// ============================================================
// Hook 实现
// ============================================================

/**
 * 通用管理后台表单 Hook
 *
 * @example
 * ```tsx
 * const { form, setField, submit, submitting, errors } = useAdminForm({
 *   initialData: { name: "", type: "system" },
 *   rules: {
 *     name: { required: true, message: "请输入名称" },
 *   },
 *   onSubmit: async (data, mode) => {
 *     await api.createTag(data);
 *   },
 *   onSuccess: () => {
 *     toast({ title: "保存成功" });
 *     closeDialog();
 *   },
 * });
 * ```
 */
export function useAdminForm<T extends Record<string, unknown>>({
  initialData,
  rules = {},
  onSubmit,
  onSuccess,
  onError,
}: UseAdminFormOptions<T>): UseAdminFormReturn<T> {
  const [form, setForm] = useState<T>(initialData);
  const [mode, setMode] = useState<FormMode>("create");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [originalData, setOriginalData] = useState<T>(initialData);

  // 检查表单是否被修改
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(originalData);
  }, [form, originalData]);

  // 设置单个字段
  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    setErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  // 设置多个字段
  const setFields = useCallback((fields: Partial<T>) => {
    setForm((prev) => ({ ...prev, ...fields }));
    // 清除相关字段的错误
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(fields)) {
        delete next[key as keyof T];
      }
      return next;
    });
  }, []);

  // 验证单个字段
  const validateField = useCallback(<K extends keyof T>(field: K): boolean => {
    const rule = rules[field];
    if (!rule) return true;

    const value = form[field];

    // 必填验证
    if (rule.required) {
      const isEmpty = value === undefined || value === null || value === "";
      if (isEmpty) {
        setErrors((prev) => ({
          ...prev,
          [field]: rule.message || "此字段为必填项",
        }));
        return false;
      }
    }

    // 自定义验证
    if (rule.validate) {
      const error = rule.validate(value, form);
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
        return false;
      }
    }

    // 清除错误
    setErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });

    return true;
  }, [form, rules]);

  // 验证整个表单
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors<T> = {};
    let isValid = true;

    for (const key of Object.keys(rules) as Array<keyof T>) {
      const rule = rules[key];
      if (!rule) continue;

      const value = form[key];

      // 必填验证
      if (rule.required) {
        const isEmpty = value === undefined || value === null || value === "";
        if (isEmpty) {
          newErrors[key] = rule.message || "此字段为必填项";
          isValid = false;
          continue;
        }
      }

      // 自定义验证
      if (rule.validate) {
        const error = rule.validate(value, form);
        if (error) {
          newErrors[key] = error;
          isValid = false;
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [form, rules]);

  // 重置表单
  const reset = useCallback(() => {
    setForm(initialData);
    setOriginalData(initialData);
    setMode("create");
    setErrors({});
  }, [initialData]);

  // 重置到指定数据
  const resetTo = useCallback((data: T, newMode: FormMode = "edit") => {
    setForm(data);
    setOriginalData(data);
    setMode(newMode);
    setErrors({});
  }, []);

  // 清除所有错误
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // 清除单个字段错误
  const clearFieldError = useCallback(<K extends keyof T>(field: K) => {
    setErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  // 提交表单
  const submit = useCallback(async () => {
    // 验证表单
    if (!validate()) {
      return;
    }

    // 如果没有提交处理函数，直接返回
    if (!onSubmit) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form, mode);
      onSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error("提交失败");
      onError?.(err);
    } finally {
      setSubmitting(false);
    }
  }, [form, mode, validate, onSubmit, onSuccess, onError]);

  return {
    form,
    mode,
    submitting,
    errors,
    isDirty,
    setField,
    setFields,
    reset,
    resetTo,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    submit,
    setSubmitting,
  };
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 创建字段变更处理器
 * 用于简化 input onChange 处理
 */
export function createFieldHandler<T extends Record<string, unknown>>(
  setField: UseAdminFormReturn<T>["setField"],
  field: keyof T
) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setField(field, e.target.value as T[keyof T]);
  };
}

/**
 * 创建 Select 变更处理器
 */
export function createSelectHandler<T extends Record<string, unknown>>(
  setField: UseAdminFormReturn<T>["setField"],
  field: keyof T,
  options?: {
    /** 空值时设置为 undefined */
    emptyAsUndefined?: boolean;
    /** 特定值映射为空 */
    emptyValue?: string;
  }
) {
  return (value: string) => {
    const { emptyAsUndefined, emptyValue = "none" } = options || {};
    if (emptyAsUndefined && value === emptyValue) {
      setField(field, undefined as T[keyof T]);
    } else {
      setField(field, value as T[keyof T]);
    }
  };
}
