/**
 * 分镜选择逻辑 Hook
 * 负责管理分镜的选择、取消选择、批量操作
 */

import { useState, useCallback } from "react";
import type { Panel } from "./NineGridDialog.types";
import { REQUIRED_PANELS_COUNT } from "./NineGridDialog.constants";

interface UsePanelSelectionReturn {
  selectedPanelIds: string[];
  togglePanel: (panelId: string) => void;
  selectFirst9: (panels: Panel[]) => void;
  clearSelection: () => void;
  resetSelection: () => void;
  isSelected: (panelId: string) => boolean;
  getSelectionIndex: (panelId: string) => number;
  canSelectMore: boolean;
  isValidSelection: boolean;
}

export function usePanelSelection(): UsePanelSelectionReturn {
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);

  const togglePanel = useCallback((panelId: string) => {
    setSelectedPanelIds((prev) => {
      // 如果已选中，则取消选择
      if (prev.includes(panelId)) {
        return prev.filter((id) => id !== panelId);
      }
      
      // 如果未达到上限，则添加选择
      if (prev.length < REQUIRED_PANELS_COUNT) {
        return [...prev, panelId];
      }
      
      // 已达上限，不做改变
      return prev;
    });
  }, []);

  const selectFirst9 = useCallback((panels: Panel[]) => {
    if (panels.length < REQUIRED_PANELS_COUNT) return;
    
    const first9 = panels.slice(0, REQUIRED_PANELS_COUNT).map((p) => p.id);
    setSelectedPanelIds((prev) => {
      // 检查是否相同，避免不必要的更新
      const isSame =
        prev.length === first9.length &&
        prev.every((id, index) => id === first9[index]);
      return isSame ? prev : first9;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPanelIds((prev) => (prev.length ? [] : prev));
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedPanelIds([]);
  }, []);

  const isSelected = useCallback(
    (panelId: string) => selectedPanelIds.includes(panelId),
    [selectedPanelIds]
  );

  const getSelectionIndex = useCallback(
    (panelId: string) => selectedPanelIds.indexOf(panelId),
    [selectedPanelIds]
  );

  const canSelectMore = selectedPanelIds.length < REQUIRED_PANELS_COUNT;
  const isValidSelection = selectedPanelIds.length === REQUIRED_PANELS_COUNT;

  return {
    selectedPanelIds,
    togglePanel,
    selectFirst9,
    clearSelection,
    resetSelection,
    isSelected,
    getSelectionIndex,
    canSelectMore,
    isValidSelection,
  };
}
