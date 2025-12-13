/**
 * 统一的 UI 状态管理 Hook
 * 使用 useReducer 集中管理所有 UI 状态
 */

import { useReducer, useCallback, useMemo } from 'react';
import type { Panel } from '../types/script-editor.types';

// UI 状态类型定义
export interface UIState {
  editMode: boolean;
  storyForm: {
    title: string;
    premise: string;
  };
  editingPanel: Partial<Panel> | null;
  isDialogOpen: boolean;
  deletingPanelId: string | null;
}

// UI 操作类型定义
export type UIAction =
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'UPDATE_STORY_FORM'; payload: Partial<UIState['storyForm']> }
  | { type: 'SET_STORY_FORM'; payload: UIState['storyForm'] }
  | { type: 'SET_EDITING_PANEL'; payload: Partial<Panel> | null }
  | { type: 'SET_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_DELETING_PANEL'; payload: string | null }
  | { type: 'RESET_FORM' }
  | { type: 'OPEN_NEW_PANEL_DIALOG'; payload: string } // projectId
  | { type: 'OPEN_EDIT_PANEL_DIALOG'; payload: Panel }
  | { type: 'CLOSE_PANEL_DIALOG' }
  | { type: 'UPDATE_PANEL_FIELD'; payload: { field: string; value: string } };

// 初始状态
const initialState: UIState = {
  editMode: false,
  storyForm: {
    title: '',
    premise: '',
  },
  editingPanel: null,
  isDialogOpen: false,
  deletingPanelId: null,
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

    default:
      return state;
  }
}

/**
 * 自定义 Hook 封装 UI 状态管理
 */
export function useUIState() {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  // 封装常用操作为便捷方法 - 使用 useMemo 确保 actions 对象引用稳定
  const actions = useMemo(() => ({
    setEditMode: (editMode: boolean) => {
      dispatch({ type: 'SET_EDIT_MODE', payload: editMode });
    },

    updateStoryForm: (updates: Partial<UIState['storyForm']>) => {
      dispatch({ type: 'UPDATE_STORY_FORM', payload: updates });
    },

    setStoryForm: (form: UIState['storyForm']) => {
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
  }), [dispatch]);

  return { state, dispatch, actions };
}