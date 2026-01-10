/**
 * 九宫格对话框相关类型定义
 */

export interface Chapter {
  id: string;
  title: string;
  chapter_order: number;
  summary?: string | null;
}

export interface Panel {
  id: string;
  panel_order: number;
  description: string;
  visual_prompt: string;
  generated_image?: string;
}

export interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  prompt_prefix?: string | null;
  image_url?: string | null;
}

export interface CharacterAsset {
  id: string;
  name: string;
  base_image_url: string | null;
  comic_style?: ComicStyle | null;
}

export interface NineGridDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  projectId: string | null;
  chapters: Chapter[];
  onSuccess: () => void;
}

export interface NineGridFormData {
  chapterId: string;
  panelIds?: string[];
  comicStyleId?: string;
  referenceImageId?: string;
}

export interface GenerateNineGridPayload {
  project_id: string;
  panel_ids: string[];
  comic_style_id?: string;
  style_prompt?: string | null;
  reference_image?: string | null;
}
