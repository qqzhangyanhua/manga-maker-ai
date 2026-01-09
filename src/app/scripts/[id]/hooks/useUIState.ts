/**
 * 统一的 UI 状态管理 Hook
 * 使用 useReducer 集中管理所有 UI 状态
 */

import { useReducer, useMemo } from 'react';
import type { Panel, StoryFormData } from '../types/script-editor.types';

// Tab 类型常量
export const TAB_VALUES = {
  SERIAL: 'serial',
  CHARACTERS: 'characters',
  GALLERY: 'gallery',
  LAYOUT: 'layout',
} as const;

export type TabValue = typeof TAB_VALUES[keyof typeof TAB_VALUES];

// 生成分镜对话框状态
export interface GenerateDialogState {
  open: boolean;
  pendingChapterId: string | null;
}

// 章节对话框状态
export interface ChapterDialogState {
  open: boolean;
  mode: 'create' | 'generate-next';
  nextOrder: number;
}

// UI 状态类型定义
export interface UIState {
  // 编辑模式
  editMode: boolean;
  storyForm: StoryFormData;

  // 分镜编辑
  editingPanel: Partial<Panel> | null;
  isDialogOpen: boolean;
  deletingPanelId: string | null;

  // 新增：页面级状态
  currentChapterId: string | null;
  activeTab: TabValue;
  generateDialog: GenerateDialogState;
  chapterDialog: ChapterDialogState;
}

// UI 操作类型定义
export type UIAction =
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'UPDATE_STORY_FORM'; payload: Partial<StoryFormData> }
  | { type: 'SET_STORY_FORM'; payload: StoryFormData }
  | { type: 'SET_EDITING_PANEL'; payload: Partial<Panel> | null }
  | { type: 'SET_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_DELETING_PANEL'; payload: string | null }
  | { type: 'RESET_FORM' }
  | { type: 'OPEN_NEW_PANEL_DIALOG'; payload: string } // projectId
  | { type: 'OPEN_EDIT_PANEL_DIALOG'; payload: Panel }
  | { type: 'CLOSE_PANEL_DIALOG' }
  | { type: 'UPDATE_PANEL_FIELD'; payload: { field: string; value: string } }
  // 新增：页面级操作
  | { type: 'SET_CURRENT_CHAPTER'; payload: string | null }
  | { type: 'SET_ACTIVE_TAB'; payload: TabValue }
  | { type: 'OPEN_GENERATE_DIALOG'; payload: string } // chapterId
  | { type: 'CLOSE_GENERATE_DIALOG' }
  | { type: 'OPEN_CHAPTER_DIALOG'; payload: { mode: 'create' | 'generate-next'; nextOrder: number } }
  | { type: 'CLOSE_CHAPTER_DIALOG' };

// 初始状态
const initialState: UIState = {
  editMode: false,
  storyForm: {
    title: '',
    premise: '',
    comic_style_id: null,
    style_reference_image: null,
  },
  editingPanel: null,
  isDialogOpen: false,
  deletingPanelId: null,
  // 新增：页面级状态初始值
  currentChapterId: null,
  activeTab: TAB_VALUES.SERIAL,
  generateDialog: { open: false, pendingChapterId: null },
  chapterDialog: { open: false, mode: 'create', nextOrder: 1 },
};

// Reducer 函数
function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_EDIT_MODE':
      return { ...state, editMode: action.payload };

    case 'UPDATE_STORY_FORM':
      return {
        ...state,
        storyForm: { ...state.storyForm, ...action.payload },
      };

    case 'SET_STORY_FORM':
      return { ...state, storyForm: action.payload };

    case 'SET_EDITING_PANEL':
      return { ...state, editingPanel: action.payload };

    case 'SET_DIALOG_OPEN':
      return { ...state, isDialogOpen: action.payload };

    case 'SET_DELETING_PANEL':
      return { ...state, deletingPanelId: action.payload };

    case 'RESET_FORM':
      return {
        ...state,
        editMode: false,
        editingPanel: null,
        isDialogOpen: false,
        deletingPanelId: null,
      };

    case 'OPEN_NEW_PANEL_DIALOG':
      return {
        ...state,
        editingPanel: {
          project_id: action.payload,
          description: '',
          panel_type: 'medium',
          importance: 'medium',
          camera_angle: 'eye_level',
          shot_size: 'medium_shot',
          dialogue: '',
          character_name: '',
          emotion: '',
          visual_prompt: '',
        },
        isDialogOpen: true,
      };

    case 'OPEN_EDIT_PANEL_DIALOG':
      return {
        ...state,
        editingPanel: { ...action.payload },
        isDialogOpen: true,
      };

    case 'CLOSE_PANEL_DIALOG':
      return {
        ...state,
        editingPanel: null,
        isDialogOpen: false,
      };

    case 'UPDATE_PANEL_FIELD':
      return {
        ...state,
        editingPanel: state.editingPanel
          ? { ...state.editingPanel, [action.payload.field]: action.payload.value }
          : null,
      };

    // 新增：页面级操作处理
    case 'SET_CURRENT_CHAPTER':
      return { ...state, currentChapterId: action.payload };

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };

    case 'OPEN_GENERATE_DIALOG':
      return {
        ...state,
        generateDialog: { open: true, pendingChapterId: action.payload },
      };

    case 'CLOSE_GENERATE_DIALOG':
      return {
        ...state,
        generateDialog: { open: false, pendingChapterId: null },
      };

    case 'OPEN_CHAPTER_DIALOG':
      return {
        ...state,
        chapterDialog: { open: true, ...action.payload },
      };

    case 'CLOSE_CHAPTER_DIALOG':
      return {
        ...state,
        chapterDialog: { open: false, mode: 'create', nextOrder: 1 },
      };

    default:
      return state;
  }
}

// Actions 类型导出
export interface UIActions {
  setEditMode: (editMode: boolean) => void;
  updateStoryForm: (updates: Partial<StoryFormData>) => void;
  setStoryForm: (form: StoryFormData) => void;
  openNewPanelDialog: (projectId: string) => void;
  openEditPanelDialog: (panel: Panel) => void;
  closePanelDialog: () => void;
  updatePanelField: (field: string, value: string) => void;
  setDeletingPanel: (panelId: string | null) => void;
  resetForm: () => void;
  // 新增：页面级 actions
  setCurrentChapter: (chapterId: string | null) => void;
  setActiveTab: (tab: TabValue) => void;
  openGenerateDialog: (chapterId: string) => void;
  closeGenerateDialog: () => void;
  openChapterDialog: (mode: 'create' | 'generate-next', nextOrder: number) => void;
  closeChapterDialog: () => void;
}

/**
 * 自定义 Hook 封装 UI 状态管理
 */
export function useUIState() {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  // 封装常用操作为便捷方法 - 使用 useMemo 确保 actions 对象引用稳定
  const actions = useMemo<UIActions>(() => ({
    setEditMode: (editMode: boolean) => {
      dispatch({ type: 'SET_EDIT_MODE', payload: editMode });
    },

    updateStoryForm: (updates: Partial<StoryFormData>) => {
      dispatch({ type: 'UPDATE_STORY_FORM', payload: updates });
    },

    setStoryForm: (form: StoryFormData) => {
      dispatch({ type: 'SET_STORY_FORM', payload: form });
    },

    openNewPanelDialog: (projectId: string) => {
      dispatch({ type: 'OPEN_NEW_PANEL_DIALOG', payload: projectId });
    },

    openEditPanelDialog: (panel: Panel) => {
      dispatch({ type: 'OPEN_EDIT_PANEL_DIALOG', payload: panel });
    },

    closePanelDialog: () => {
      dispatch({ type: 'CLOSE_PANEL_DIALOG' });
    },

    updatePanelField: (field: string, value: string) => {
      dispatch({ type: 'UPDATE_PANEL_FIELD', payload: { field, value } });
    },

    setDeletingPanel: (panelId: string | null) => {
      dispatch({ type: 'SET_DELETING_PANEL', payload: panelId });
    },

    resetForm: () => {
      dispatch({ type: 'RESET_FORM' });
    },

    // 新增：页面级 actions
    setCurrentChapter: (chapterId: string | null) => {
      dispatch({ type: 'SET_CURRENT_CHAPTER', payload: chapterId });
    },

    setActiveTab: (tab: TabValue) => {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
    },

    openGenerateDialog: (chapterId: string) => {
      dispatch({ type: 'OPEN_GENERATE_DIALOG', payload: chapterId });
    },

    closeGenerateDialog: () => {
      dispatch({ type: 'CLOSE_GENERATE_DIALOG' });
    },

    openChapterDialog: (mode: 'create' | 'generate-next', nextOrder: number) => {
      dispatch({ type: 'OPEN_CHAPTER_DIALOG', payload: { mode, nextOrder } });
    },

    closeChapterDialog: () => {
      dispatch({ type: 'CLOSE_CHAPTER_DIALOG' });
    },
  }), []);

  return { state, dispatch, actions };
}
