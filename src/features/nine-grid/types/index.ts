/**
 * 九宫格功能类型定义
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
  shot_size?: string;
  camera_angle?: string;
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

export interface GenerateNineGridParams {
  chapterId: string;
  projectId: string;
  panelIds: string[];
  comicStyleId?: string;
  stylePrompt?: string;
  referenceImage?: string;
}

export interface NineGridResult {
  id: string;
  image_url: string;
  prompt_combined: string;
}

export interface NineGridHistory {
  id: string;
  timestamp: number;
  params: GenerateNineGridParams;
  result: NineGridResult;
}
