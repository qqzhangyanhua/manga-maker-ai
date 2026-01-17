/**
 * 无限画布状态管理 (Zustand Store)
 *
 * 职责:
 * 1. 管理节点选择状态 (多选支持)
 * 2. 管理详情面板状态 (打开/关闭/类型)
 * 3. 管理 SSE 连接状态 (Phase 2.3)
 * 4. 管理批量操作模式 (Phase 3)
 */

import { create } from 'zustand';

/**
 * 节点类型定义
 */
export type NodeType = 'script' | 'shot' | 'scene' | 'final';

/**
 * SSE 连接状态
 */
export type SSEStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * 工作流自动化配置
 */
interface WorkflowAutomation {
  enabled: boolean; // 是否启用自动化
  autoNextStage: boolean; // 完成后自动触发下一阶段
}

/**
 * 详情面板状态
 */
interface DetailPanelState {
  isOpen: boolean;
  nodeType: NodeType | null;
  chapterId: string | null;
}

/**
 * 场景生成弹窗状态
 */
interface SceneDialogState {
  isOpen: boolean;
  chapterId: string | null;
  chapterTitle: string | null;
  chapterNumber: number | null;
  timelineId: string | null;
}

/**
 * Canvas Store 接口定义
 */
interface CanvasStore {
  // ==================== 节点选择状态 ====================
  selectedNodeIds: Set<string>;

  /**
   * 选择单个节点
   * @param id 节点 ID
   * @param isMulti 是否多选模式 (Shift/Ctrl 键)
   */
  selectNode: (id: string, isMulti?: boolean) => void;

  /**
   * 批量设置选中节点 (用于框选)
   */
  setSelectedNodeIds: (ids: Set<string>) => void;

  /**
   * 清空选择
   */
  clearSelection: () => void;

  // ==================== 详情面板状态 ====================
  detailPanel: DetailPanelState;

  /**
   * 打开详情面板
   * @param nodeType 节点类型 (script/shot/scene/final)
   * @param chapterId 章节 ID
   */
  openDetail: (nodeType: NodeType, chapterId: string) => void;

  /**
   * 关闭详情面板
   */
  closeDetail: () => void;

  // ==================== SSE 连接状态 (Phase 2.3) ====================
  sseStatus: SSEStatus;

  /**
   * 设置 SSE 连接状态
   */
  setSseStatus: (status: SSEStatus) => void;

  // ==================== 批量操作模式 (Phase 3) ====================
  batchMode: boolean;

  /**
   * 切换批量操作模式
   */
  toggleBatchMode: () => void;

  // ==================== 工作流自动化 (Phase 2.5) ====================
  workflowAutomation: WorkflowAutomation;

  /**
   * 切换工作流自动化
   */
  toggleWorkflowAutomation: () => void;

  /**
   * 设置自动化配置
   */
  setWorkflowAutomation: (config: Partial<WorkflowAutomation>) => void;

  // ==================== 场景生成弹窗状态 ====================
  sceneDialog: SceneDialogState;

  /**
   * 打开场景生成弹窗
   */
  openSceneDialog: (chapterId: string, chapterTitle: string, chapterNumber: number, timelineId: string) => void;

  /**
   * 关闭场景生成弹窗
   */
  closeSceneDialog: () => void;
}

/**
 * 创建 Canvas Store
 */
export const useCanvasStore = create<CanvasStore>((set) => ({
  // ==================== 初始状态 ====================
  selectedNodeIds: new Set<string>(),
  detailPanel: {
    isOpen: false,
    nodeType: null,
    chapterId: null,
  },
  sseStatus: 'disconnected',
  batchMode: false,
  workflowAutomation: {
    enabled: false,
    autoNextStage: false,
  },
  sceneDialog: {
    isOpen: false,
    chapterId: null,
    chapterTitle: null,
    chapterNumber: null,
    timelineId: null,
  },

  // ==================== Actions ====================
  selectNode: (id: string, isMulti = false) => set((state) => {
    const newSet: Set<string> = isMulti
      ? new Set(state.selectedNodeIds)  // 保留已选中节点
      : new Set<string>();                       // 清空已选中节点

    // 切换选中状态 (如果已选中则取消,否则添加)
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }

    return { selectedNodeIds: newSet };
  }),

  setSelectedNodeIds: (ids: Set<string>) => set({ selectedNodeIds: ids }),

  clearSelection: () => set({ selectedNodeIds: new Set<string>() }),

  openDetail: (nodeType: NodeType, chapterId: string) => set({
    detailPanel: {
      isOpen: true,
      nodeType,
      chapterId,
    },
  }),

  closeDetail: () => set({
    detailPanel: {
      isOpen: false,
      nodeType: null,
      chapterId: null,
    },
  }),

  setSseStatus: (status: SSEStatus) => set({ sseStatus: status }),

  toggleBatchMode: () => set((state) => ({
    batchMode: !state.batchMode,
    // 切换批量模式时清空选择
    selectedNodeIds: !state.batchMode ? state.selectedNodeIds : new Set<string>(),
  })),

  toggleWorkflowAutomation: () => set((state) => ({
    workflowAutomation: {
      ...state.workflowAutomation,
      enabled: !state.workflowAutomation.enabled,
    },
  })),

  setWorkflowAutomation: (config: Partial<WorkflowAutomation>) => set((state) => ({
    workflowAutomation: {
      ...state.workflowAutomation,
      ...config,
    },
  })),

  openSceneDialog: (chapterId: string, chapterTitle: string, chapterNumber: number, timelineId: string) => set({
    sceneDialog: {
      isOpen: true,
      chapterId,
      chapterTitle,
      chapterNumber,
      timelineId,
    },
  }),

  closeSceneDialog: () => set({
    sceneDialog: {
      isOpen: false,
      chapterId: null,
      chapterTitle: null,
      chapterNumber: null,
      timelineId: null,
    },
  }),
}));

/**
 * Selector Hooks (性能优化)
 */

/**
 * 获取详情面板状态
 */
export const useDetailPanel = () => useCanvasStore((state) => state.detailPanel);

/**
 * 获取打开详情面板的方法
 */
export const useOpenDetail = () => useCanvasStore((state) => state.openDetail);

/**
 * 获取关闭详情面板的方法
 */
export const useCloseDetail = () => useCanvasStore((state) => state.closeDetail);

/**
 * 获取选中节点 IDs
 */
export const useSelectedNodeIds = () => useCanvasStore((state) => state.selectedNodeIds);

/**
 * 获取 SSE 连接状态
 */
export const useSSEStatus = () => useCanvasStore((state) => state.sseStatus);

/**
 * 获取批量模式状态
 */
export const useBatchMode = () => useCanvasStore((state) => state.batchMode);

/**
 * 获取工作流自动化配置
 */
export const useWorkflowAutomation = () => useCanvasStore((state) => state.workflowAutomation);

/**
 * 获取场景生成弹窗状态
 */
export const useSceneDialog = () => useCanvasStore((state) => state.sceneDialog);

/**
 * 获取打开场景生成弹窗的方法
 */
export const useOpenSceneDialog = () => useCanvasStore((state) => state.openSceneDialog);

/**
 * 获取关闭场景生成弹窗的方法
 */
export const useCloseSceneDialog = () => useCanvasStore((state) => state.closeSceneDialog);
