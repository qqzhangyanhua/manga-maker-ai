/**
 * AI 图片生成服务类型定义
 */

/**
 * 图片生成参数
 */
export interface ImageGenerationParams {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  sampler_name?: string;
  seed?: number;
  batch_size?: number;
  referenceImageUrl?: string; // 单个参考图URL（向后兼容）
  referenceImageUrls?: string[]; // 多个参考图URLs（Phase 2新增）
}

/**
 * 图片生成结果
 */
export interface ImageGenerationResult {
  success: boolean;
  images: string[]; // base64 encoded images
  info?: string;
  error?: string;
  creditsCost?: number; // 本次调用消耗的算力
}

/**
 * 图片生成调用选项
 */
export type ImageGenerationOptions =
  | { skipCreditsCheck: true; userId?: never }
  | { skipCreditsCheck?: false; userId: string };
