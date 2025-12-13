/**
 * 布局历史记录 Hook
 * 实现布局操作的撤销/重做功能
 */

import { useState, useCallback, useRef } from "react";

/**
 * 历史记录项
 */
interface HistoryEntry<T> {
  state: T;
  description: string;
  timestamp: number;
}

interface UseLayoutHistoryOptions<T> {
  /** 最大历史记录数量 */
  maxHistory?: number;
  /** 获取当前状态的函数 */
  getCurrentState: () => T;
  /** 恢复状态的函数 */
  restoreState: (state: T) => Promise<void>;
  /** 比较两个状态是否相同 */
  isEqual?: (a: T, b: T) => boolean;
}

interface UseLayoutHistoryReturn<T> {
  /** 是否可以撤销 */
  canUndo: boolean;
  /** 是否可以重做 */
  canRedo: boolean;
  /** 历史记录数量 */
  historyCount: number;
  /** 当前索引 */
  currentIndex: number;
  /** 撤销操作 */
  undo: () => Promise<void>;
  /** 重做操作 */
  redo: () => Promise<void>;
  /** 保存当前状态到历史记录 */
  saveState: (description: string) => void;
  /** 清空历史记录 */
  clearHistory: () => void;
  /** 是否正在执行撤销/重做 */
  isRestoring: boolean;
}

/**
 * 默认状态比较函数
 */
function defaultIsEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useLayoutHistory<T>({
  maxHistory = 50,
  getCurrentState,
  restoreState,
  isEqual = defaultIsEqual,
}: UseLayoutHistoryOptions<T>): UseLayoutHistoryReturn<T> {
  // 历史记录栈
  const [history, setHistory] = useState<HistoryEntry<T>[]>([]);
  // 当前索引（指向最新的已应用状态）
  const [currentIndex, setCurrentIndex] = useState(-1);
  // 是否正在恢复状态
  const [isRestoring, setIsRestoring] = useState(false);
  // 防止重复保存
  const lastSavedStateRef = useRef<T | null>(null);

  // 保存当前状态
  const saveState = useCallback(
    (description: string) => {
      if (isRestoring) return;

      const currentState = getCurrentState();

      // 检查是否与上次保存的状态相同
      if (
        lastSavedStateRef.current !== null &&
        isEqual(currentState, lastSavedStateRef.current)
      ) {
        return;
      }

      const entry: HistoryEntry<T> = {
        state: currentState,
        description,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        // 如果不在最新位置，裁剪掉后面的记录
        const newHistory = prev.slice(0, currentIndex + 1);
        // 添加新记录
        newHistory.push(entry);
        // 限制最大历史记录数量
        if (newHistory.length > maxHistory) {
          newHistory.shift();
          return newHistory;
        }
        return newHistory;
      });

      setCurrentIndex((prev) => Math.min(prev + 1, maxHistory - 1));
      lastSavedStateRef.current = currentState;
    },
    [getCurrentState, isEqual, currentIndex, maxHistory, isRestoring]
  );

  // 撤销
  const undo = useCallback(async () => {
    if (currentIndex < 0 || isRestoring) return;

    // 如果是第一次撤销，先保存当前状态以便重做
    if (currentIndex === history.length - 1) {
      const currentState = getCurrentState();
      const entry: HistoryEntry<T> = {
        state: currentState,
        description: "当前状态",
        timestamp: Date.now(),
      };
      setHistory((prev) => [...prev, entry]);
    }

    const targetIndex = currentIndex - 1;
    if (targetIndex < 0) return;

    setIsRestoring(true);
    try {
      const targetEntry = history[targetIndex];
      await restoreState(targetEntry.state);
      setCurrentIndex(targetIndex);
      lastSavedStateRef.current = targetEntry.state;
    } finally {
      setIsRestoring(false);
    }
  }, [currentIndex, history, getCurrentState, restoreState, isRestoring]);

  // 重做
  const redo = useCallback(async () => {
    if (currentIndex >= history.length - 1 || isRestoring) return;

    const targetIndex = currentIndex + 1;

    setIsRestoring(true);
    try {
      const targetEntry = history[targetIndex];
      await restoreState(targetEntry.state);
      setCurrentIndex(targetIndex);
      lastSavedStateRef.current = targetEntry.state;
    } finally {
      setIsRestoring(false);
    }
  }, [currentIndex, history, restoreState, isRestoring]);

  // 清空历史
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    lastSavedStateRef.current = null;
  }, []);

  return {
    canUndo: currentIndex > 0 && !isRestoring,
    canRedo: currentIndex < history.length - 1 && !isRestoring,
    historyCount: history.length,
    currentIndex,
    undo,
    redo,
    saveState,
    clearHistory,
    isRestoring,
  };
}
