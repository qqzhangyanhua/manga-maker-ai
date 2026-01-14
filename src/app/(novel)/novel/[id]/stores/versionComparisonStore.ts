/**
 * 版本对比状态管理 (Zustand)
 * 管理版本对比模式和选中的版本
 */
import { create } from "zustand";

interface VersionComparisonStore {
  // 对比模式是否启用
  isComparisonMode: boolean;
  setComparisonMode: (enabled: boolean) => void;

  // 选中用于对比的版本 ID（最多2个）
  selectedVersionsForCompare: [string?, string?];
  toggleVersionForCompare: (versionId: string) => void;
  clearComparisonSelection: () => void;

  // Diff 视图类型（未来扩展用）
  diffViewType: "unified" | "split";
  setDiffViewType: (type: "unified" | "split") => void;
}

export const useVersionComparisonStore = create<VersionComparisonStore>(
  (set) => ({
    // 初始状态
    isComparisonMode: false,
    selectedVersionsForCompare: [],
    diffViewType: "unified",

    // 切换对比模式
    setComparisonMode: (enabled) =>
      set({
        isComparisonMode: enabled,
        // 关闭对比模式时清空选择
        selectedVersionsForCompare: enabled ? [] : [],
      }),

    // 切换版本选择（最多2个）
    toggleVersionForCompare: (versionId) =>
      set((state) => {
        const current = state.selectedVersionsForCompare;

        // 如果已选中，则取消选中
        if (current.includes(versionId)) {
          return {
            selectedVersionsForCompare: current.filter(
              (id) => id !== versionId
            ) as [string?, string?],
          };
        }

        // 如果已有2个，替换第一个
        if (current.length >= 2) {
          return {
            selectedVersionsForCompare: [current[1], versionId] as [string, string],
          };
        }

        // 添加新选择
        const newSelection = [...current, versionId];
        return {
          selectedVersionsForCompare: newSelection as [string?, string?],
        };
      }),

    // 清空对比选择
    clearComparisonSelection: () =>
      set({ selectedVersionsForCompare: [] }),

    // 设置 Diff 视图类型
    setDiffViewType: (type) => set({ diffViewType: type }),
  })
);
