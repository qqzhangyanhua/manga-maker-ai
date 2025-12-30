/**
 * ScriptEditor Context 类型定义
 */

import type { Story, Panel, Chapter, StoryFormData } from './script-editor.types';
import type { CharacterReference } from './character.types';
import type { StoryCharacterWithDetails, CharacterRole } from '@/components/StoryCharacter/types';
import type { UIState, UIActions, TabValue } from '../hooks/useUIState';

/**
 * 核心数据上下文
 */
export interface ScriptEditorDataContext {
  // Core identifiers
  storyId: string;
  projectId: string | null;

  // Data
  story: Story | null;
  panels: Panel[];
  chapters: Chapter[];

  // Characters
  characterAssets: CharacterReference[];
  storyCharacters: StoryCharacterWithDetails[];

  // Loading states
  isLoading: boolean;
  isPanelsLoading: boolean;
  isCharactersLoading: boolean;
  isStoryCharactersLoading: boolean;

  // Refresh functions
  refreshStoryData: () => Promise<void>;
  refetchCharacters: () => void;
  refetchStoryCharacters: () => void;
}

/**
 * UI 状态上下文
 */
export interface ScriptEditorUIContext {
  state: UIState;
  actions: UIActions;
}

/**
 * 操作上下文
 */
export interface ScriptEditorOperationsContext {
  // Story operations
  updateStory: () => Promise<void>;
  isSaving: boolean;

  // Character operations
  addCharacter: (characterId: string, role: CharacterRole) => Promise<void>;
  removeCharacter: (characterId: string) => Promise<void>;
  updateCharacterRole: (characterId: string, role: CharacterRole) => Promise<void>;

  // Panel operations
  deletePanel: (panelId: string) => Promise<void>;
  onImageGenerated: (panelId: string, imageUrl: string) => Promise<void>;

  // Generation
  handleGeneratePanelsForChapter: (chapterId: string) => Promise<void>;
  executeGeneration: (
    chapterId: string,
    mode: 'overwrite' | 'append',
    panelCount?: number
  ) => Promise<void>;
  isGenerating: boolean;

  // Computed helpers
  getNextChapterOrder: () => number;
}

/**
 * 完整的 ScriptEditor Context（组合）
 */
export interface ScriptEditorContextValue {
  data: ScriptEditorDataContext;
  ui: ScriptEditorUIContext;
  operations: ScriptEditorOperationsContext;
}

// Re-export types for convenience
export type { UIState, UIActions, TabValue, CharacterRole };
