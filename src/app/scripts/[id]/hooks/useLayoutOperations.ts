/**
 * 分镜布局操作Hook
 * 管理布局模式状态和API调用
 */

import { useState, useCallback } from "react";
import type { Panel } from "../types/script-editor.types";
import type { LayoutApiResponse } from "../types/layout.types";

interface UseLayoutOperationsOptions {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

interface UseLayoutOperationsReturn {
  isLayoutMode: boolean;
  selectedPanelIds: string[];
  isApplying: boolean;
  enterLayoutMode: () => void;
  exitLayoutMode: () => void;
  togglePanelSelection: (panelId: string) => void;
  selectPanelGroup: (panelIds: string[]) => void;
  clearSelection: () => void;
  applyLayout: (panelIds: string[], layoutType: "2" | "4" | "6") => Promise<void>;
  breakLayout: (panelId: string) => Promise<void>;
}

export function useLayoutOperations(
  options: UseLayoutOperationsOptions = {}
): UseLayoutOperationsReturn {
  const { onSuccess, onError } = options;

  const [isLayoutMode, setIsLayoutMode] = useState(false);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const enterLayoutMode = useCallback(() => {
    setIsLayoutMode(true);
    setSelectedPanelIds([]);
  }, []);

  const exitLayoutMode = useCallback(() => {
    setIsLayoutMode(false);
    setSelectedPanelIds([]);
  }, []);

  const togglePanelSelection = useCallback((panelId: string) => {
    setSelectedPanelIds((prev) => {
      if (prev.includes(panelId)) {
        return prev.filter((id) => id !== panelId);
      }
      return [...prev, panelId];
    });
  }, []);

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
    async (panelIds: string[], layoutType: "2" | "4" | "6") => {
      if (isApplying) return;

      setIsApplying(true);
      try {
        const response = await fetch("/api/panel/batch-layout", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ panelIds, layoutType }),
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
    selectPanelGroup,
    clearSelection,
    applyLayout,
    breakLayout,
  };
}
