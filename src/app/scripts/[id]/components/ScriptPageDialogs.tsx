/**
 * 对话框管理组件集合
 * 集中管理页面所有对话框的渲染和交互
 */

import { ImportTextDialog } from "@/components/StoryScript/ImportTextDialog";
import { NineGridDialog } from "./NineGridDialog";
import { DialogsManager } from "./DialogsManager";
import type { UIState, UIActions } from "../hooks/useUIState";
import type { Chapter, Panel } from "../types/script-editor.types";
import type { StoryCharacterWithDetails } from "@/components/StoryCharacter/types";

export interface ScriptPageDialogsProps {
  // 基础信息
  storyId: string;
  projectId: string | null;
  chapters: Chapter[];

  // UI 状态
  uiState: UIState;
  uiActions: UIActions;

  // 对话框状态
  importTextDialogOpen: boolean;
  setImportTextDialogOpen: (open: boolean) => void;
  nineGridDialogOpen: boolean;
  setNineGridDialogOpen: (open: boolean) => void;

  // 数据
  nextChapterOrder: number;
  suggestedCharacters: Array<{ name: string; role: string; description?: string }>;
  storyCharacters: StoryCharacterWithDetails[];
  panels: Panel[];

  // 小说角色同步相关（与 DialogsManagerProps 一致）
  novelCharacterSync: {
    dialogOpen: boolean;
    charactersWithStatus: Array<{ name: string; role: string; generated: boolean }>;
    closeDialog: () => void;
  };

  // 回调函数
  onRefresh: () => Promise<void>;
  onRefetchStoryCharacters: () => Promise<void>;
  onExecuteGeneration: (
    chapterId: string,
    mode: "overwrite" | "append",
    panelCount?: number
  ) => Promise<void>;
  onNineGridSuccess: () => void;
  onImportSuccess: () => void;
}

/**
 * 对话框集合组件
 *
 * 管理以下对话框：
 * 1. DialogsManager - 章节、生成、角色同步对话框
 * 2. ImportTextDialog - 导入文本对话框
 * 3. NineGridDialog - 九宫格分镜生成对话框
 */
export function ScriptPageDialogs({
  storyId,
  projectId,
  chapters,
  uiState,
  uiActions,
  importTextDialogOpen,
  setImportTextDialogOpen,
  nineGridDialogOpen,
  setNineGridDialogOpen,
  nextChapterOrder,
  suggestedCharacters,
  storyCharacters,
  panels,
  novelCharacterSync,
  onRefresh,
  onRefetchStoryCharacters,
  onExecuteGeneration,
  onNineGridSuccess,
  onImportSuccess,
}: ScriptPageDialogsProps) {
  return (
    <>
      {/* 章节、生成、角色同步对话框管理器 */}
      <DialogsManager
        storyId={storyId}
        projectId={projectId}
        panels={panels}
        uiState={uiState}
        uiActions={uiActions}
        nextChapterOrder={nextChapterOrder}
        suggestedCharacters={suggestedCharacters}
        storyCharacters={storyCharacters}
        novelCharacterSync={novelCharacterSync}
        onRefresh={onRefresh}
        onRefetchStoryCharacters={onRefetchStoryCharacters}
        onExecuteGeneration={onExecuteGeneration}
      />

      {/* 导入文本对话框 */}
      <ImportTextDialog
        open={importTextDialogOpen}
        onOpenChange={setImportTextDialogOpen}
        storyId={storyId}
        projectId={projectId || ""}
        onSuccess={onImportSuccess}
      />

      {/* 九宫格对话框 */}
      <NineGridDialog
        open={nineGridDialogOpen}
        onOpenChange={setNineGridDialogOpen}
        storyId={storyId}
        projectId={projectId}
        chapters={chapters}
        onSuccess={onNineGridSuccess}
      />
    </>
  );
}
