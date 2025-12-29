/**
 * ComfyUI 提供商适配器 (暂未实现)
 */

import type { ImageGenerationParams, ImageGenerationResult } from "../types";

/**
 * 调用 ComfyUI API (TODO: 需要实现)
 */
export async function callComfyUIAPI(
  baseUrl: string,
  params: ImageGenerationParams,
  apiKey?: string
): Promise<ImageGenerationResult> {
  // ComfyUI 的 API 调用较复杂，需要使用 workflow JSON
  // 这里先返回未实现的错误
  throw new Error("ComfyUI 支持暂未实现，请先使用 Stable Diffusion (Automatic1111)");
}
