/**
 * 导入文本功能的类型定义
 */

/**
 * 导入文本请求
 */
export interface ImportTextRequest {
  text: string;
  chapterTitle?: string;
  projectId: string;
  panelCount?: number;
}

/**
 * 导入文本响应
 */
export interface ImportTextResponse {
  success: true;
  chapterId: string;
  chapterTitle: string;
  panels: Array<{
    id: string;
    panel_order: number;
    description: string;
    visual_prompt: string;
    dialogue: string | null;
    panel_type: string;
    importance: string;
    camera_angle: string | null;
    shot_size: string | null;
    camera_movement: string | null;
    movement_speed: string | null;
    movement_direction: string | null;
  }>;
  message: string;
}

/**
 * 预估积分请求
 */
export interface EstimateImportCostRequest {
  text: string;
}

/**
 * 预估积分响应
 */
export interface EstimateImportCostResponse {
  success: true;
  estimate: {
    wordCount: number;
    estimatedPanels: number;
    estimatedCredits: number;
    creditsPerCall: number;
    currentCredits: number;
    hasEnoughCredits: boolean;
    warning: string | null;
  };
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  maxLength?: number;
  currentLength?: number;
  limit?: number;
  used?: number;
}
