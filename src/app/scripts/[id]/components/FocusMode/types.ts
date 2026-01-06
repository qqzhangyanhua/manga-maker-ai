/**
 * 专注模式类型定义
 * Focus Mode Type Definitions
 */

import type { Panel } from "@prisma/client";
import type { Chapter } from "@prisma/client";
import type { Character } from "@prisma/client";
import type { ReferenceImage as GlobalReferenceImage } from "@/types/reference-image.types";

/**
 * 专注模式面板状态
 */
export interface FocusModePanel {
  id: string;
  chapter_id: string;
  panel_order: number;
  description: string;
  prompt_used: string | null;
  image_url: string | null;
  image_generation_status: string | null;
  created_at: string;
  updated_at: string;
  // 扩展字段
  characters?: string[];
  scene_reference?: string | null;
}

/**
 * 参考图类型（使用全局类型）
 */
export type ReferenceImage = GlobalReferenceImage;

/**
 * 专注模式配置
 */
export interface FocusModeConfig {
  // 图像生成配置
  selectedCharacters: string[];
  sceneReference: string | null;
  stylePreset: string | null;
  modelName: string;
  
  // 参考图配置
  referenceImages: ReferenceImage[];
  
  // 提示词配置
  customPrompt: string;
  negativePrompt: string;
  
  // 生成参数
  aspectRatio: string;
  numInferenceSteps: number;
  guidanceScale: number;
}

/**
 * 专注模式状态
 */
export interface FocusModeState {
  // 当前选中的分镜
  currentPanelId: string | null;
  currentPanel: FocusModePanel | null;
  
  // 配置状态
  config: FocusModeConfig;
  
  // UI状态
  isGenerating: boolean;
  generationProgress: number;
  
  // 预览状态
  previewImageUrl: string | null;
  showOriginal: boolean;
}

/**
 * 专注模式操作接口
 */
export interface FocusModeActions {
  // 导航操作
  selectPanel: (panelId: string) => void;
  goToPreviousPanel: () => void;
  goToNextPanel: () => void;
  
  // 配置操作
  updateConfig: (config: Partial<FocusModeConfig>) => void;
  resetConfig: () => void;
  
  // 生成操作
  generateImage: () => Promise<void>;
  cancelGeneration: () => void;
  
  // 编辑操作
  updatePanelDescription: (description: string) => Promise<void>;
  updatePanelPrompt: (prompt: string) => Promise<void>;
  deletePanelImage: () => Promise<void>;
  
  // 退出操作
  exitFocusMode: () => void;
}

/**
 * 专注模式上下文值
 */
export interface FocusModeContextValue {
  state: FocusModeState;
  actions: FocusModeActions;

  // 数据源
  panels: Panel[];
  chapters: Chapter[];
  characters: Character[];

  // 加载状态
  isLoading: boolean;

  // 预览控制
  setPreviewImage?: (imageUrl: string | null) => void;
  toggleShowOriginal?: () => void;
}

/**
 * 默认配置
 */
export const DEFAULT_FOCUS_MODE_CONFIG: FocusModeConfig = {
  selectedCharacters: [],
  sceneReference: null,
  stylePreset: null,
  modelName: "Nano-Banana-Pro",
  referenceImages: [],
  customPrompt: "",
  negativePrompt: "",
  aspectRatio: "16:9",
  numInferenceSteps: 50,
  guidanceScale: 7.5,
};

