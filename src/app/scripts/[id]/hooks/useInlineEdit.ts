/**
 * Inline 编辑 Hook
 * 提供编辑状态管理、防抖保存、乐观更新功能
 */

import { useState, useCallback, useRef, useEffect } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseInlineEditOptions {
  /** 初始值 */
  initialValue: string;
  /** 保存回调 */
  onSave: (value: string) => Promise<void>;
  /** 防抖延迟（毫秒），默认 300ms */
  debounceMs?: number;
  /** 保存成功后状态持续时间（毫秒），默认 2000ms */
  savedDurationMs?: number;
}

export interface UseInlineEditReturn {
  /** 当前值 */
  value: string;
  /** 设置值 */
  setValue: (value: string) => void;
  /** 是否处于编辑模式 */
  isEditing: boolean;
  /** 开始编辑 */
  startEditing: () => void;
  /** 取消编辑（恢复原值） */
  cancelEditing: () => void;
  /** 确认保存并退出编辑 */
  confirmEditing: () => void;
  /** 保存状态 */
  saveStatus: SaveStatus;
  /** 错误信息 */
  error: string | null;
}

export function useInlineEdit({
  initialValue,
  onSave,
  debounceMs = 300,
  savedDurationMs = 2000,
}: UseInlineEditOptions): UseInlineEditReturn {
  const [value, setValueState] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // 保存原始值用于取消恢复
  const originalValueRef = useRef(initialValue);
  // 防抖定时器
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 保存成功状态定时器
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 最新值引用（用于防抖回调）
  const latestValueRef = useRef(value);

  // 同步外部 initialValue 变化
  useEffect(() => {
    if (!isEditing) {
      setValueState(initialValue);
      originalValueRef.current = initialValue;
    }
  }, [initialValue, isEditing]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  // 执行保存
  const executeSave = useCallback(
    async (valueToSave: string) => {
      if (valueToSave === originalValueRef.current) {
        return; // 值未变化，不保存
      }

      setSaveStatus("saving");
      setError(null);

      try {
        await onSave(valueToSave);
        originalValueRef.current = valueToSave; // 更新原始值
        setSaveStatus("saved");

        // 2秒后恢复 idle 状态
        savedTimerRef.current = setTimeout(() => {
          setSaveStatus("idle");
        }, savedDurationMs);
      } catch (err) {
        setSaveStatus("error");
        setError(err instanceof Error ? err.message : "保存失败");
      }
    },
    [onSave, savedDurationMs]
  );

  // 设置值（带防抖保存）
  const setValue = useCallback(
    (newValue: string) => {
      setValueState(newValue);
      latestValueRef.current = newValue;

      // 清除之前的防抖定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 设置新的防抖定时器
      debounceTimerRef.current = setTimeout(() => {
        void executeSave(latestValueRef.current);
      }, debounceMs);
    },
    [debounceMs, executeSave]
  );

  // 开始编辑
  const startEditing = useCallback(() => {
    originalValueRef.current = value;
    setIsEditing(true);
    setError(null);
  }, [value]);

  // 取消编辑
  const cancelEditing = useCallback(() => {
    // 清除防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setValueState(originalValueRef.current);
    setIsEditing(false);
    setSaveStatus("idle");
    setError(null);
  }, []);

  // 确认编辑（立即保存）
  const confirmEditing = useCallback(() => {
    // 清除防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    void executeSave(value);
    setIsEditing(false);
  }, [executeSave, value]);

  return {
    value,
    setValue,
    isEditing,
    startEditing,
    cancelEditing,
    confirmEditing,
    saveStatus,
    error,
  };
}
