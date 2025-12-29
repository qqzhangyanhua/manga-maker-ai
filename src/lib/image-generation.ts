/**
 * AI 图片生成服务 - 向后兼容导出
 *
 * 注意：此文件已被重构为模块化结构。
 * 实际实现位于 ./image-generation/ 目录下。
 *
 * 文件结构：
 * - types.ts: 类型定义
 * - core.ts: 核心路由函数
 * - utils.ts: 工具函数
 * - character-generation.ts: 角色生成相关函数
 * - providers/stable-diffusion.ts: Stable Diffusion 提供商
 * - providers/openai.ts: OpenAI/DALL-E 提供商
 * - providers/comfyui.ts: ComfyUI 提供商
 */

// 类型定义
export type {
  ImageGenerationParams,
  ImageGenerationResult,
  ImageGenerationOptions,
} from "./image-generation/types";

// 核心函数
export { callImageGenerationByType } from "./image-generation/core";

// 角色生成函数
export {
  generateCharacterViews,
  generateThreeViews,
  generatePoseVariant,
} from "./image-generation/character-generation";

// 工具函数
export { urlToBase64, base64ToBuffer } from "./image-generation/utils";

// 提供商适配器（一般不需要直接导出，但保留以便高级用法）
export { callStableDiffusionAPI } from "./image-generation/providers/stable-diffusion";
export { callOpenAIImageAPI } from "./image-generation/providers/openai";
export { callComfyUIAPI } from "./image-generation/providers/comfyui";
