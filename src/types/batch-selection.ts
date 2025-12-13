/**
 * 批量选择相关类型定义
 */

export interface BatchSelectionState {
  /** 已选中的分镜ID集合 */
  selectedIds: Set<string>;
  /** 是否处于多选模式 */
  isSelectionMode: boolean;
  /** 最后一次选中的分镜ID（用于 Shift 连选） */
  lastSelectedId: string | null;
}

export interface BatchSelectionActions {
  /** 切换单个分镜的选中状态 */
  toggleSelection: (id: string) => void;
  /** 范围选择（Shift+点击） */
  selectRange: (fromId: string, toId: string, allIds: string[]) => void;
  /** 全选 */
  selectAll: (allIds: string[]) => void;
  /** 清空选择 */
  clearSelection: () => void;
  /** 进入多选模式 */
  enterSelectionMode: () => void;
  /** 退出多选模式 */
  exitSelectionMode: () => void;
  /** 检查是否选中 */
  isSelected: (id: string) => boolean;
  /** 获取选中数量 */
  getSelectedCount: () => number;
  /** 获取选中的ID数组 */
  getSelectedIds: () => string[];
}

export type BatchSelectionHook = BatchSelectionState & BatchSelectionActions;

/** 批量操作类型 */
export type BatchOperationType =
  | "update_character"
  | "update_style"
  | "update_camera"
  | "generate"
  | "delete";

/** 批量操作加载状态 */
export interface BatchOperationLoadingState {
  type: BatchOperationType | null;
  isLoading: boolean;
  progress?: {
    current: number;
    total: number;
  };
}
