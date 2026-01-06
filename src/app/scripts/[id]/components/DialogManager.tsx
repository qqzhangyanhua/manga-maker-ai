"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GeneratePanelsDialog } from "./GeneratePanelsDialog";
import { CreateChapterDialog } from "@/components/CreateChapterDialog";
import { ImportTextDialog } from "@/components/StoryScript/ImportTextDialog";
import { useScriptData } from "../providers/ScriptDataProvider";
import { useScriptOperations } from "../providers/ScriptOperationsProvider";
import { useUIState } from "../hooks/useUIState";

interface DialogManagerProps {
  nextChapterOrder: number;
  onGeneratePanels: (chapterId: string, mode: string, panelCount?: number) => void;
}

/**
 * 对话框管理器组件
 *
 * 职责：
 * 1. 集中管理所有对话框的渲染
 * 2. 从 Context 获取对话框状态
 * 3. 处理对话框的打开/关闭逻辑
 *
 * 优点：
 * - 减少父组件的渲染逻辑
 * - 对话框状态集中管理
 * - 易于维护和测试
 */
export function DialogManager({
  nextChapterOrder,
  onGeneratePanels,
}: DialogManagerProps) {
  const { storyId, projectId, panels } = useScriptData();
  const {
    dialogs,
    closeDialog,
    confirmBatchDelete,
    pendingDeletePanelIds,
    handleImportTextSuccess,
  } = useScriptOperations();
  const { state: uiState, actions: uiActions } = useUIState();

  return (
    <>
      {/* 生成分镜对话框 */}
      <GeneratePanelsDialog
        open={uiState.generateDialog.open}
        existingPanelCount={
          uiState.generateDialog.pendingChapterId
            ? panels.filter((p) => p.chapter_id === uiState.generateDialog.pendingChapterId)
                .length
            : 0
        }
        onOpenChange={(open) => {
          if (!open) uiActions.closeGenerateDialog();
        }}
        onConfirm={(mode, panelCount) => {
          if (uiState.generateDialog.pendingChapterId) {
            onGeneratePanels(uiState.generateDialog.pendingChapterId, mode, panelCount);
          }
        }}
      />

      {/* 创建章节对话框 */}
      <CreateChapterDialog
        open={uiState.chapterDialog.open}
        onOpenChange={(open) => {
          if (!open) uiActions.closeChapterDialog();
        }}
        storyId={storyId}
        nextChapterOrder={uiState.chapterDialog.nextOrder}
        onSuccess={() => {
          // 刷新数据由父组件通过 refetchAll 处理
          uiActions.closeChapterDialog();
        }}
      />

      {/* 导入文本对话框 */}
      <ImportTextDialog
        open={dialogs.importText}
        onOpenChange={(open) => {
          if (!open) closeDialog("importText");
        }}
        storyId={storyId}
        projectId={projectId || ""}
        onSuccess={handleImportTextSuccess}
      />

      {/* 批量删除确认对话框 */}
      <AlertDialog
        open={dialogs.batchDelete}
        onOpenChange={(open) => {
          if (!open) closeDialog("batchDelete");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 {pendingDeletePanelIds.length} 个分镜吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => closeDialog("batchDelete")}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmBatchDelete()}
              className="bg-destructive hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
