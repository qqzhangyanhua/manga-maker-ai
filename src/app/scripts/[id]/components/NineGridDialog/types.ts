/**
 * 九宫格对话框相关类型定义
 */

// ==================== 数据模型 ====================

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

// ==================== 组件 Props ====================

export interface NineGridDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  projectId: string | null;
  chapters: Chapter[];
  onSuccess: () => void;
}

export interface PanelSelectorProps {
  panels: Panel[];
  selectedPanelIds: string[];
  isLoading: boolean;
  onPanelToggle: (panelId: string) => void;
  onSelectFirst9: () => void;
  onClearSelection: () => void;
}

// ==================== 状态管理 ====================

export interface DialogState {
  // 数据加载状态
  chapterPanels: Panel[];
  isLoadingPanels: boolean;
  comicStyles: ComicStyle[];
  isLoadingStyles: boolean;
  characterAssets: CharacterAsset[];
  isLoadingAssets: boolean;
  
  // 选择状态
  selectedChapterId: string;
  selectedPanelIds: string[];
  
  // 生成状态
  isGenerating: boolean;
  
  // 生成结果
  generatedImageUrl: string | null;
  generatedPanels: Array<{
    panel_order: number;
    description: string;
    visual_prompt: string;
  }> | null;
}

export type DialogAction =
  | { type: "SET_CHAPTER"; chapterId: string }
  | { type: "SET_PANELS"; panels: Panel[] }
  | { type: "SET_LOADING_PANELS"; loading: boolean }
  | { type: "SET_STYLES"; styles: ComicStyle[] }
  | { type: "SET_LOADING_STYLES"; loading: boolean }
  | { type: "SET_ASSETS"; assets: CharacterAsset[] }
  | { type: "SET_LOADING_ASSETS"; loading: boolean }
  | { type: "TOGGLE_PANEL"; panelId: string }
  | { type: "SELECT_FIRST_9" }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_GENERATING"; generating: boolean }
  | { type: "SET_RESULT"; imageUrl: string; panels?: Array<{ panel_order: number; description: string; visual_prompt: string }> }
  | { type: "CLEAR_RESULT" }
  | { type: "RESET" };

// ==================== 表单数据 ====================

export type GenerationMode = "from-panels" | "from-plot";

export interface FormData {
  mode: GenerationMode;
  chapterId: string;
  plotSummary?: string;  // 从剧情生成时使用
  comicStyleId?: string;
  referenceImageId?: string;
}

// ==================== API 请求/响应 ====================

export interface GenerateNineGridRequest {
  project_id: string;
  panel_ids: string[];
  comic_style_id?: string;
  style_prompt?: string | null;
  reference_image?: string | null;
}

export interface GenerateFromPlotRequest {
  project_id: string;
  plot_summary: string;
  comic_style_id?: string;
  reference_image?: string;
}

export interface GenerateNineGridResponse {
  success: boolean;
  error?: string;
  image_url?: string;
  nine_grid_id?: string;
  panels?: Array<{
    panel_order: number;
    description: string;
    visual_prompt: string;
  }>;
  message?: string;
}

export interface GenerationStep {
  current: 1 | 2 | null;
  total: 2;
  message: string;
}
