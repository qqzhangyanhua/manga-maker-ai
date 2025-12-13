/**
 * 批量选择状态管理 Hook
 *
 * 功能：
 * - 管理多选模式状态
 * - 支持单选、范围选择（Shift+点击）、全选
 * - 提供选中状态查询方法
 */

import { useState, useCallback, useMemo } from "react";
import type { BatchSelectionHook } from "@/types/batch-selection";

export function useBatchSelection(): BatchSelectionHook {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // 切换单个分镜的选中状态
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastSelectedId(id);
  }, []);

  // 范围选择（Shift+点击）
  const selectRange = useCallback(
    (fromId: string, toId: string, allIds: string[]) => {
      const fromIndex = allIds.indexOf(fromId);
      const toIndex = allIds.indexOf(toId);

      if (fromIndex === -1 || toIndex === -1) return;

      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          next.add(allIds[i]);
        }
        return next;
      });
      setLastSelectedId(toId);
    },
    []
  );

  // 全选
  const selectAll = useCallback((allIds: string[]) => {
    setSelectedIds(new Set(allIds));
    if (allIds.length > 0) {
      setLastSelectedId(allIds[allIds.length - 1]);
    }
  }, []);

  // 清空选择
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  // 进入多选模式
  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  // 退出多选模式
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  // 检查是否选中
  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  // 获取选中数量
  const getSelectedCount = useCallback(
    () => selectedIds.size,
    [selectedIds]
  );

  // 获取选中的ID数组
  const getSelectedIds = useCallback(
    () => Array.from(selectedIds),
    [selectedIds]
  );

  return useMemo(
    () => ({
      selectedIds,
      isSelectionMode,
      lastSelectedId,
      toggleSelection,
      selectRange,
      selectAll,
      clearSelection,
      enterSelectionMode,
      exitSelectionMode,
      isSelected,
      getSelectedCount,
      getSelectedIds,
    }),
    [
      selectedIds,
      isSelectionMode,
      lastSelectedId,
      toggleSelection,
      selectRange,
      selectAll,
      clearSelection,
      enterSelectionMode,
      exitSelectionMode,
      isSelected,
      getSelectedCount,
      getSelectedIds,
    ]
  );
}
