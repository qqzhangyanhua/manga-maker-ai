/**
 * 九宫格图片生成功能 - 类型定义
 */

/**
 * 镜头设计基础信息
 */
export interface ShotDesignBasic {
  id: string;
  shot_order: number;
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  shot_description: string;
  composition_hint: string;
  prompt: string;
  generated_image_url?: string | null;
  generation_status?: string;
}

/**
 * 九宫格生成请求体
 */
export interface NineGridGenerateRequest {
  shotIds: string[];
  comicStyleId?: string;
  plotSummary: string;
}

/**
 * 九宫格生成响应体
 */
export interface NineGridGenerateResponse {
  success: boolean;
  taskId: string;
  status: 'pending' | 'generating';
  message?: string;
}

/**
 * 九宫格对话框 Props
 */
export interface GenerateNineGridDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedShots: ShotDesignBasic[];
  timelineId: string | null;
  chapterId: string | null;
  chapterSummary?: string;
  onConfirm: (payload: NineGridGenerateRequest) => void;
  isSubmitting?: boolean;
}

/**
 * 九宫格选择模式状态
 */
export interface NineGridSelectionState {
  isSelectMode: boolean;
  selectedShotIds: Set<string>;
}
