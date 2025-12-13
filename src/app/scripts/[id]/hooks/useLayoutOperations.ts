/**
 * 分镜布局操作Hook
 * 管理布局模式状态和API调用
 * 支持撤销最近的布局操作
 */

import { useState, useCallback, useRef } from "react";
import type { LayoutApiResponse, LayoutSize, LayoutDirection, LayoutRatio } from "../types/layout.types";
import type { Panel } from "../types/script-editor.types";

/**
 * 布局操作历史记录
 */
interface LayoutHistoryEntry {
  type: "apply" | "break";
  panelIds: string[];
  previousHints: { id: string; hint: string | null }[];
  timestamp: number;
}

interface UseLayoutOperationsOptions {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

/**
 * 选择修饰键类型
 */
interface SelectionModifiers {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean; // Mac的Cmd键
}

interface UseLayoutOperationsReturn {
  isLayoutMode: boolean;
  selectedPanelIds: string[];
  isApplying: boolean;
  canUndo: boolean;
  enterLayoutMode: () => void;
  exitLayoutMode: () => void;
  togglePanelSelection: (panelId: string) => void;
  /** 带修饰键的选择（支持Shift连续选择、Ctrl/Cmd多选） */
  selectPanelWithModifiers: (
    panelId: string,
    allPanels: Panel[],
    modifiers: SelectionModifiers
  ) => void;
  selectPanelGroup: (panelIds: string[]) => void;
  clearSelection: () => void;
  applyLayout: (
    panelIds: string[],
    layoutType: LayoutSize,
    direction?: LayoutDirection,
    ratio?: LayoutRatio
  ) => Promise<void>;
  breakLayout: (panelId: string) => Promise<void>;
  /** 撤销最近的布局操作 */
  undoLastOperation: () => Promise<void>;
  /** 清空历史记录 */
  clearHistory: () => void;
}

export function useLayoutOperations(
  options: UseLayoutOperationsOptions = {}
): UseLayoutOperationsReturn {
  const { onSuccess, onError } = options;

  const [isLayoutMode, setIsLayoutMode] = useState(false);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  // 记录最后选中的Panel ID，用于Shift范围选择
  const lastSelectedIdRef = useRef<string | null>(null);

  const enterLayoutMode = useCallback(() => {
    setIsLayoutMode(true);
    setSelectedPanelIds([]);
    lastSelectedIdRef.current = null;
  }, []);

  const exitLayoutMode = useCallback(() => {
    setIsLayoutMode(false);
    setSelectedPanelIds([]);
    lastSelectedIdRef.current = null;
  }, []);

  const togglePanelSelection = useCallback((panelId: string) => {
    setSelectedPanelIds((prev) => {
      if (prev.includes(panelId)) {
        return prev.filter((id) => id !== panelId);
      }
      return [...prev, panelId];
    });
    lastSelectedIdRef.current = panelId;
  }, []);

  /**
   * 带修饰键的选择
   * - Shift: 从上次选中的位置到当前位置范围选择
   * - Ctrl/Cmd: 切换当前Panel的选中状态（多选）
   * - 无修饰键: 清空之前的选择，只选中当前Panel
   */
  const selectPanelWithModifiers = useCallback(
    (panelId: string, allPanels: Panel[], modifiers: SelectionModifiers) => {
      const { shiftKey, ctrlKey, metaKey } = modifiers;
      const isMultiSelectKey = ctrlKey || metaKey;

      // Shift+点击：范围选择
      if (shiftKey && lastSelectedIdRef.current) {
        const lastIndex = allPanels.findIndex((p) => p.id === lastSelectedIdRef.current);
        const currentIndex = allPanels.findIndex((p) => p.id === panelId);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const startIdx = Math.min(lastIndex, currentIndex);
          const endIdx = Math.max(lastIndex, currentIndex);
          const rangeIds = allPanels.slice(startIdx, endIdx + 1).map((p) => p.id);

          setSelectedPanelIds((prev) => {
            // 保留之前的选择，添加范围内的所有Panel
            const newSelection = [...prev];
            rangeIds.forEach((id) => {
              if (!newSelection.includes(id)) {
                newSelection.push(id);
              }
            });
            return newSelection;
          });
          // 不更新lastSelectedId，保持范围选择的起点
          return;
        }
      }

      // Ctrl/Cmd+点击：切换选中状态（多选）
      if (isMultiSelectKey) {
        setSelectedPanelIds((prev) => {
          if (prev.includes(panelId)) {
            return prev.filter((id) => id !== panelId);
          }
          return [...prev, panelId];
        });
        lastSelectedIdRef.current = panelId;
        return;
      }

      // 无修饰键：单选（清空之前的选择）
      setSelectedPanelIds([panelId]);
      lastSelectedIdRef.current = panelId;
    },
    []
  );

  const selectPanelGroup = useCallback((panelIds: string[]) => {
    setSelectedPanelIds((prev) => {
      // 如果组内所有Panel都已选中，则取消选择
      const allSelected = panelIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !panelIds.includes(id));
      }
      // 否则选中所有组内Panel
      const newSelection = [...prev];
      panelIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPanelIds([]);
  }, []);

  const applyLayout = useCallback(
    async (
      panelIds: string[],
      layoutType: LayoutSize,
      direction?: LayoutDirection,
      ratio?: LayoutRatio
    ) => {
      if (isApplying) return;

      setIsApplying(true);
      try {
        const requestBody: {
          panelIds: string[];
          layoutType: LayoutSize;
          direction?: LayoutDirection;
          ratio?: LayoutRatio;
        } = { panelIds, layoutType };

        // 2镜和3镜需要方向参数
        if (layoutType === "2" || layoutType === "3") {
          requestBody.direction = direction || "h";
          if (ratio) {
            requestBody.ratio = ratio;
          }
        }

        const response = await fetch("/api/panel/batch-layout", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const data: LayoutApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            (data as unknown as { error: string }).error || "应用布局失败"
          );
        }

        // 成功后清空选择并退出布局模式
        setSelectedPanelIds([]);
        setIsLayoutMode(false);
        onSuccess?.();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "应用布局失败";
        onError?.(message);
      } finally {
        setIsApplying(false);
      }
    },
    [isApplying, onSuccess, onError]
  );

  const breakLayout = useCallback(
    async (panelId: string) => {
      if (isApplying) return;

      setIsApplying(true);
      try {
        const response = await fetch("/api/panel/break-layout", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ panelId }),
        });

        const data: LayoutApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            (data as unknown as { error: string }).error || "拆分布局失败"
          );
        }

        onSuccess?.();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "拆分布局失败";
        onError?.(message);
      } finally {
        setIsApplying(false);
      }
    },
    [isApplying, onSuccess, onError]
  );

  return {
    isLayoutMode,
    selectedPanelIds,
    isApplying,
    enterLayoutMode,
    exitLayoutMode,
    togglePanelSelection,
    selectPanelWithModifiers,
    selectPanelGroup,
    clearSelection,
    applyLayout,
    breakLayout,
  };
}
