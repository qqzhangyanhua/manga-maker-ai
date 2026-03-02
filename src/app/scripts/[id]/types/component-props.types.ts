/**
 * 组件 Props 类型定义
 * 为所有子组件提供明确的类型约束
 */

import type { Chapter, Panel } from './script-editor.types';
import type { StoryCharacterWithDetails } from '@/components/StoryCharacter/types';
import type { ProgressCalculationResult } from '@/hooks/useProgressCalculation';

// 简化的类型定义,避免与现有类型冲突
interface CharacterAsset {
  id: string;
  name: string;
  base_image_url?: string | null;
  description?: string | null;
}

interface SuggestedCharacter {
  name: string;
  role: string;
  description?: string;
}

interface BackgroundGenerationParams {
  scene_type: string;
  style: string;
  prompt?: string;
  negative_prompt?: string;
}

// ==================== 页面顶部组件 ====================

export interface ScriptPageTopBarProps {
  title: string;
  chapters: Chapter[];
  panels: Panel[];
  nextChapterOrder: number;
  onCreateChapter: () => void;
  onImportText: () => void;
  onEnterFocusMode: () => void;
  onOpenSidebar: () => void;
  onOpenNineGrid?: () => void;
  /** 故事表单保存状态，用于 AutoSaveIndicator */
  saveStatus?: "idle" | "unsaved" | "saving" | "saved" | "error";
}

export interface ScriptPageHeaderProps {
  title: string;
  chapters: Chapter[];
  panels: Panel[];
  onCreateChapter: () => void;
  onImportText: () => void;
  onEnterFocusMode?: () => void;
  onOpenNineGrid?: () => void;
}

// ==================== 引导组件 ====================

export interface ScriptPageGuidanceProps {
  progressStats: ProgressCalculationResult;
  chapters: Chapter[];
  onGeneratePanelsForChapter: (chapterId: string) => void;
  onSetCurrentChapter: (chapterId: string) => void;
  onBatchGenerateImages: () => void;
}

// ==================== Tab 组件 ====================

export interface ScriptPageTabsProps {
  activeTab: string;
  storyId: string;
  projectId: string | null;
  sourceNovelId: string | null;
  storyTitle: string;
  storyStyle?: string;
  chapters: Chapter[];
  panels: Panel[];
  storyCharacters: StoryCharacterWithDetails[];
  characterAssets: CharacterAsset[];
  isCharactersLoading: boolean;
  isStoryCharactersLoading: boolean;
  isGenerating: boolean;
  streamingPanels: Panel[];
  progressStats: ProgressCalculationResult;
  nextChapterOrder: number;
  onTabChange: (value: string) => void;
  onGenerateNext: () => void;
  onGeneratePanels: (chapterId: string) => void;
  onGenerateBackground: (
    chapterId: string,
    params: BackgroundGenerationParams
  ) => Promise<void>;
  onDeletePanel: (panelId: string) => Promise<void>;
  onImageGenerated: (panelId: string, imageUrl: string) => Promise<void>;
  onCharactersRefresh: () => void;
  onStoryCharactersRefresh: () => void;
  onRefreshStoryData: () => Promise<void>;
  onRefetchPanels: () => Promise<void>;
  onError: (message: string) => void;
}

// ==================== 对话框管理器 ====================

export interface DialogsManagerProps {
  storyId: string;
  projectId: string | null;
  panels: Panel[];
  uiState: {
    generateDialog: {
      open: boolean;
      pendingChapterId: string | null;
    };
    chapterDialog: {
      open: boolean;
      mode: 'create' | 'generate-next';
      nextOrder: number;
    };
  };
  uiActions: {
    closeGenerateDialog: () => void;
    closeChapterDialog: () => void;
  };
  nextChapterOrder: number;
  suggestedCharacters: Array<{ name: string; role: string; description?: string }>;
  storyCharacters: StoryCharacterWithDetails[];
  novelCharacterSync: {
    dialogOpen: boolean;
    charactersWithStatus: Array<{ name: string; role: string; generated: boolean }>;
    closeDialog: () => void;
  };
  onRefresh: () => Promise<void>;
  onRefetchStoryCharacters: () => Promise<void>;
  onExecuteGeneration: (
    chapterId: string,
    mode: 'overwrite' | 'append',
    panelCount?: number
  ) => Promise<void>;
}

// 修正 SuggestedCharacter 导入
interface SuggestedCharacter {
  name: string;
  role: string;
  description?: string;
}

// ==================== 九宫格对话框 ====================

export interface NineGridDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  projectId: string | null;
  chapters: Chapter[];
  onSuccess: () => void;
}

// ==================== 小说角色同步 ====================

export interface NovelCharacterSyncPromptProps {
  shouldShow: boolean;
  novelTitle: string;
  unmatchedCount: number;
  onSyncClick: () => void;
}

// ==================== 小说来源卡片 ====================

export interface NovelSourceCardProps {
  sourceNovel: {
    id: string;
    title: string;
    author?: string | null;
    description?: string | null;
    cover_image?: string | null;
  } | null;
  sourceNovelId: string | null;
  storyId: string;
}

// ==================== 资源库侧边栏 ====================

export interface AssetLibrarySidebarSheetProps {
  open: boolean;
  storyId: string;
  projectId: string | null;
  characterAssets: CharacterAsset[];
  isCharactersLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onCharacterSelect: (character: { id: string; name: string }) => Promise<void>;
  onSceneSelect: (scene: { id: string; name: string }) => Promise<void>;
}
