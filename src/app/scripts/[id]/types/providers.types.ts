/**
 * Provider 层类型定义
 * 用于统一数据管理和业务逻辑层的类型
 */

import { Story, Chapter, Character, StoryCharacter } from "@prisma/client";

// ============ 数据层类型 ============

/**
 * Panel 类型（兼容数据库和组件使用）
 * 使用 Prisma 的 Panel 类型作为基础
 */
import type { Panel as PrismaPanel } from "@prisma/client";

export type Panel = PrismaPanel;

/**
 * 数据层 Context 值
 */
export interface ScriptDataContextValue {
  // 核心数据
  storyId: string;
  projectId: string | null;
  story: Story | null;
  chapters: Chapter[];
  panels: Panel[];

  // 角色数据
  characterAssets: Character[];
  storyCharacters: StoryCharacter[];

  // 加载状态
  isLoading: boolean;
  isPanelsLoading: boolean;
  isCharactersLoading: boolean;
  isStoryCharactersLoading: boolean;
  hasStory: boolean;

  // 刷新方法
  refetchStory: () => Promise<void>;
  refetchPanels: () => Promise<void>;
  refetchCharacters: () => Promise<void>;
  refetchStoryCharacters: () => Promise<void>;
  refetchAll: () => Promise<void>;
}

// ============ 业务逻辑层类型 ============

/**
 * 批量操作进度
 */
export interface BatchProgress {
  current: number;
  total: number;
}

/**
 * 批量操作状态
 */
export interface BatchOperationState {
  isGenerating: boolean;
  isDeleting: boolean;
  progress: BatchProgress;
}

/**
 * 对话框状态
 */
export interface DialogState {
  importText: boolean;
  batchDelete: boolean;
  assetSidebar: boolean;
}

/**
 * 业务逻辑层 Context 值
 */
export interface ScriptOperationsContextValue {
  // 批量操作
  batchOperation: BatchOperationState;
  handleBatchGenerate: (panelIds: string[]) => Promise<void>;
  handleBatchDelete: (panelIds: string[]) => Promise<void>;
  confirmBatchDelete: () => Promise<void>;
  pendingDeletePanelIds: string[];

  // 导入导出
  handleImportTextSuccess: (chapterId: string) => void;

  // 对话框管理
  dialogs: DialogState;
  openDialog: (dialogName: keyof DialogState) => void;
  closeDialog: (dialogName: keyof DialogState) => void;

  // 错误处理
  errorState: string | null;
  setErrorState: (error: string | null) => void;
  clearError: () => void;
}

// ============ UI 状态层类型（已存在，这里重新导出）============

/**
 * 专注模式状态
 */
export interface FocusModeState {
  enabled: boolean;
  initialPanelId: string | null;
}
