/**
 * AI 图片生成服务统一导出
 * 支持多种图像生成服务:
 * - Stable Diffusion API (Automatic1111)
 * - OpenAI DALL-E (dall-e-2, dall-e-3)
 * - ComfyUI (暂未实现)
 * 复用 LLM Provider 架构，通过 provider_type 区分不同服务
 */

// 类型定义
export type {
  ImageGenerationParams,
  ImageGenerationResult,
  ImageGenerationOptions,
} from "./types";

// 核心函数
export { callImageGenerationByType } from "./core";

// 角色生成函数
export {
  generateCharacterViews,
  generateThreeViews,
  generatePoseVariant,
} from "./character-generation";

// 工具函数
export { urlToBase64, base64ToBuffer } from "./utils";

// 提供商适配器（一般不需要直接导出，但保留以便高级用法）
export { callStableDiffusionAPI } from "./providers/stable-diffusion";
export { callOpenAIImageAPI } from "./providers/openai";
export { callComfyUIAPI } from "./providers/comfyui";
