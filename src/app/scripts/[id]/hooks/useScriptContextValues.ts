/**
 * 脚本页面 Context 值构建 Hook
 * 封装 Context 值的构建逻辑
 */

import { useMemo } from "react";
import type {
  ScriptEditorDataContext,
  ScriptEditorUIContext,
  ScriptEditorOperationsContext,
} from "../types/context.types";
import type { UIState, UIActions } from "./useUIState";
import type { CharacterRole } from "@/components/StoryCharacter/types";

interface UseScriptContextValuesProps {
  storyId: string;
  projectId: string | null;
  story: ScriptEditorDataContext["story"];
  panels: ScriptEditorDataContext["panels"];
  chapters: ScriptEditorDataContext["chapters"];
  characterAssets: ScriptEditorDataContext["characterAssets"];
  storyCharacters: ScriptEditorDataContext["storyCharacters"];

  // Loading states
  isLoading: boolean;
  isPanelsLoading: boolean;
  isCharactersLoading: boolean;
  isStoryCharactersLoading: boolean;

  // Refresh functions
  refreshStoryData: () => Promise<void>;
  refetchCharacters: () => void;
  refetchStoryCharacters: () => void;

  // UI
  uiState: UIState;
  uiActions: UIActions;

  // Operations
  isSaving: boolean;
  isGenerating: boolean;
  nextChapterOrder: number;
  handleUpdateStory: () => Promise<void>;
  handleAddCharacter: (characterId: string, role: CharacterRole) => Promise<void>;
  handleRemoveCharacter: (characterId: string) => Promise<void>;
  handleCharacterRoleChange: (characterId: string, role: CharacterRole) => Promise<void>;
  handleDeletePanel: (panelId: string) => Promise<void>;
  handleImageGenerated: (panelId: string, imageUrl: string) => Promise<void>;
  handleGeneratePanelsForChapter: (chapterId: string) => Promise<void>;
  executeGeneration: (chapterId: string, mode: "overwrite" | "append", panelCount?: number) => Promise<void>;
}

export function useScriptContextValues({
  storyId,
  projectId,
  story,
  panels,
  chapters,
  characterAssets,
  storyCharacters,
  isLoading,
  isPanelsLoading,
  isCharactersLoading,
  isStoryCharactersLoading,
  refreshStoryData,
  refetchCharacters,
  refetchStoryCharacters,
  uiState,
  uiActions,
  isSaving,
  isGenerating,
  nextChapterOrder,
  handleUpdateStory,
  handleAddCharacter,
  handleRemoveCharacter,
  handleCharacterRoleChange,
  handleDeletePanel,
  handleImageGenerated,
  handleGeneratePanelsForChapter,
  executeGeneration,
}: UseScriptContextValuesProps) {
  const dataContextValue = useMemo<ScriptEditorDataContext>(
    () => ({
      storyId,
      projectId,
      story,
      panels,
      chapters,
      characterAssets,
      storyCharacters,
      isLoading,
      isPanelsLoading,
      isCharactersLoading,
      isStoryCharactersLoading,
      refreshStoryData,
      refetchCharacters,
      refetchStoryCharacters,
    }),
    [
      storyId,
      projectId,
      story,
      panels,
      chapters,
      characterAssets,
      storyCharacters,
      isLoading,
      isPanelsLoading,
      isCharactersLoading,
      isStoryCharactersLoading,
      refreshStoryData,
      refetchCharacters,
      refetchStoryCharacters,
    ]
  );

  const uiContextValue = useMemo<ScriptEditorUIContext>(
    () => ({
      state: uiState,
      actions: uiActions,
    }),
    [uiState, uiActions]
  );

  const operationsContextValue = useMemo<ScriptEditorOperationsContext>(
    () => ({
      updateStory: handleUpdateStory,
      isSaving,
      addCharacter: handleAddCharacter,
      removeCharacter: handleRemoveCharacter,
      updateCharacterRole: handleCharacterRoleChange,
      deletePanel: handleDeletePanel,
      onImageGenerated: handleImageGenerated,
      handleGeneratePanelsForChapter,
      executeGeneration,
      isGenerating,
      getNextChapterOrder: () => nextChapterOrder,
    }),
    [
      handleUpdateStory,
      isSaving,
      handleAddCharacter,
      handleRemoveCharacter,
      handleCharacterRoleChange,
      handleDeletePanel,
      handleImageGenerated,
      handleGeneratePanelsForChapter,
      executeGeneration,
      isGenerating,
      nextChapterOrder,
    ]
  );

  return {
    dataContextValue,
    uiContextValue,
    operationsContextValue,
  };
}
