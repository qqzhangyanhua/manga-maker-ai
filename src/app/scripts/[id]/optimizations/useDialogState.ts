/**
 * 统一的 Dialog 状态管理 Hook
 * 解决页面中多个 Dialog 状态分散的问题
 */

import { useState, useCallback } from 'react';

export type DialogType = 
  | 'closed'
  | 'generate-panels'
  | 'create-chapter'
  | 'generate-next-chapter';

export interface DialogState {
  type: DialogType;
  data?: {
    chapterId?: string;
    existingPanelCount?: number;
    nextChapterOrder?: number;
  };
}

export function useDialogState() {
  const [state, setState] = useState<DialogState>({ type: 'closed' });

  const openGeneratePanelsDialog = useCallback((chapterId: string, existingPanelCount: number) => {
    setState({
      type: 'generate-panels',
      data: { chapterId, existingPanelCount },
    });
  }, []);

  const openCreateChapterDialog = useCallback((nextChapterOrder: number) => {
    setState({
      type: 'create-chapter',
      data: { nextChapterOrder },
    });
  }, []);

  const openGenerateNextChapterDialog = useCallback((nextChapterOrder: number) => {
    setState({
      type: 'generate-next-chapter',
      data: { nextChapterOrder },
    });
  }, []);

  const closeDialog = useCallback(() => {
    setState({ type: 'closed' });
  }, []);

  return {
    state,
    openGeneratePanelsDialog,
    openCreateChapterDialog,
    openGenerateNextChapterDialog,
    closeDialog,
    // 辅助方法
    isOpen: (type: DialogType) => state.type === type,
    isAnyOpen: state.type !== 'closed',
  };
}

