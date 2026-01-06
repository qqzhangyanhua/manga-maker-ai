/**
 * SerialChapterList 组件类型定义
 */

import type { CharacterReference as CharacterRef } from "@/app/scripts/[id]/types/character.types";

// 重新导出以供外部使用
export type CharacterReference = CharacterRef;

export interface Chapter {
  id: string;
  title: string;
  summary: string | null;
  chapter_order: number;
  publish_status?: string;
  published_at?: string | null;
  created_at: string;
}

export interface Panel {
  id: string;
  chapter_id?: string;
  generated_image?: string;
  image_url?: string;
  panel_order?: number;
  title?: string;
  description?: string;
  visual_description?: string;
  visual_prompt?: string;
  prompt_used?: string;
  character_descriptions?: string;
  project_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChapterStats {
  panelCount: number;
  generatedCount: number;
  progress: number;
  hasAllImages: boolean;
}

export interface SerialChapterListProps {
  storyId: string;
  projectId: string | null;
  chapters: Chapter[];
  panels: Panel[];
  characters: CharacterReference[];
  charactersLoading?: boolean;
  isGeneratingPanels?: boolean;
  streamingPanels?: Panel[];
  onRefresh: () => Promise<void> | void;
  onCreateChapter: () => void;
  onGenerateNext: () => void;
  onGeneratePanels: (chapterId: string) => void;
  onDeletePanel: (panelId: string) => Promise<void>;
  onImageGenerated: (panelId: string, imageUrl: string) => Promise<void>;
  onCharactersRefresh?: () => void;
  onError: (message: string) => void;
}

export interface ChapterCardProps {
  chapter: Chapter;
  panels: Panel[];
  stats: ChapterStats;
  isSelected: boolean;
  isExpanded: boolean;
  showCheckbox: boolean;
  // 基础操作
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onEdit: () => void;
  onGeneratePanels: () => void;
  // 分镜编辑相关
  projectId: string | null;
  storyId: string;
  characters: CharacterReference[];
  charactersLoading?: boolean;
  isGeneratingPanels?: boolean;
  streamingPanels?: Panel[];
  onDeletePanel: (panelId: string) => Promise<void>;
  onImageGenerated: (panelId: string, imageUrl: string) => Promise<void>;
  onCharactersRefresh?: () => void;
  onRefresh: () => Promise<void> | void;
  onError: (message: string) => void;
}

export interface PublishCheckDialogProps {
  open: boolean;
  chapter: Chapter | null;
  warnings: string[];
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}
