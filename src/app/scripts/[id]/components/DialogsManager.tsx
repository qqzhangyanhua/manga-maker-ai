"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { GeneratePanelsDialog } from "./GeneratePanelsDialog";
import { CreateChapterDialog } from "@/components/CreateChapterDialog";
import { ImportTextDialog } from "@/components/StoryScript/ImportTextDialog";
import { SyncNovelCharactersDialog } from "./SyncNovelCharactersDialog";
import { CharacterDetailDialog } from "./CharacterDetailDialog";
import type { UIState, UIActions } from "../hooks/useUIState";
import type { SelectedCharacter, CharacterInfo } from "../types/character";
import type { DialogsManagerProps } from "../types/component-props.types";

export function DialogsManager({
  storyId,
  projectId,
  panels,
  uiState,
  uiActions,
  nextChapterOrder,
  suggestedCharacters,
  storyCharacters,
  novelCharacterSync,
  onRefresh,
  onRefetchStoryCharacters,
  onExecuteGeneration,
}: DialogsManagerProps) {
  const { toast } = useToast();

  // 角色详情对话框状态
  const [selectedCharacter, setSelectedCharacter] = useState<SelectedCharacter | null>(null);

  // 角色选择处理
  const handleCharacterSelect = useCallback((character: CharacterInfo, role: string) => {
    setSelectedCharacter({ character, role });
  }, []);

  // 关闭角色详情对话框
  const handleCloseDetailDialog = useCallback(() => {
    setSelectedCharacter(null);
  }, []);

  // 角色移除成功处理
  const handleCharacterRemoveSuccess = useCallback(() => {
    setSelectedCharacter(null);
    void onRefetchStoryCharacters();
    toast({
      title: "角色已移除",
      description: "角色列表已更新",
    });
  }, [onRefetchStoryCharacters, toast]);

  return (
    <>
      {/* 生成分镜对话框 */}
      <GeneratePanelsDialog
        open={uiState.generateDialog.open}
        existingPanelCount={
          uiState.generateDialog.pendingChapterId
            ? panels.filter((p) => p.chapter_id === uiState.generateDialog.pendingChapterId).length
            : 0
        }
        onOpenChange={(open) => {
          if (!open) uiActions.closeGenerateDialog();
        }}
        onConfirm={(mode, panelCount) => {
          if (uiState.generateDialog.pendingChapterId) {
            void onExecuteGeneration(uiState.generateDialog.pendingChapterId, mode, panelCount);
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
        nextChapterOrder={nextChapterOrder}
        onSuccess={() => {
          void onRefresh();
        }}
      />

      {/* 导入文本对话框 - 由外部控制 */}

      {/* 小说角色同步对话框 */}
      {novelCharacterSync.dialogOpen && (
        <SyncNovelCharactersDialog
          open={novelCharacterSync.dialogOpen}
          onOpenChange={novelCharacterSync.closeDialog}
          storyId={storyId}
          suggestedCharacters={novelCharacterSync.charactersWithStatus}
          onSuccess={() => {
            novelCharacterSync.closeDialog();
            void onRefetchStoryCharacters();
            toast({
              title: "刷新成功",
              description: "角色列表已更新",
            });
          }}
        />
      )}

      {/* 角色详情对话框 */}
      <CharacterDetailDialog
        open={!!selectedCharacter}
        onOpenChange={handleCloseDetailDialog}
        character={selectedCharacter?.character || null}
        role={selectedCharacter?.role || ""}
        storyId={storyId}
        onRemoveSuccess={handleCharacterRemoveSuccess}
      />
    </>
  );
}
