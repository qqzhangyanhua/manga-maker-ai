/**
 * AI 图片生成核心函数
 * 负责路由到不同的图片生成提供商
 */

import { ensureLlmProvider } from "../llm-provider";
import { consumeCredits, checkCredits, InsufficientCreditsError } from "../credits";
import type { ImageGenerationParams, ImageGenerationResult, ImageGenerationOptions } from "./types";
import { callStableDiffusionAPI } from "./providers/stable-diffusion";
import { callComfyUIAPI } from "./providers/comfyui";
import { callOpenAIImageAPI } from "./providers/openai";

/**
 * 调用图片生成 API（根据 provider_type 自动选择配置）
 *
 * 使用方法：
 * 1. 在 /admin/llm-providers 添加配置：
 *
 *    【Stable Diffusion】
 *    - provider_type: "image_generation"
 *    - provider_name: "sd" (或 "automatic1111")
 *    - model: "sdxl" (或你使用的模型名称)
 *    - base_url: "http://your-sd-server:7860"
 *    - api_key: "" (SD 通常不需要)
 *
 *    【OpenAI DALL-E】
 *    - provider_type: "image_generation"
 *    - provider_name: "openai" (或 "dall-e")
 *    - model: "dall-e-3" (或 "dall-e-2")
 *    - base_url: "https://api.openai.com"
 *    - api_key: "sk-..." (必需)
 *
 * 2. 调用：
 *    const result = await callImageGenerationByType({
 *      providerType: "image_generation",
 *      prompt: "a beautiful cat",
 *      width: 1024,
 *      height: 1024,
 *      options: { userId: "user-id" }
 *    });
 */
export async function callImageGenerationByType(
  params: {
    providerType: string;
    options?: ImageGenerationOptions;
  } & ImageGenerationParams
): Promise<ImageGenerationResult> {
  const { providerType, options, ...imageParams } = params;

  // 查找配置
  const provider = await ensureLlmProvider(providerType);

  // 算力检查与扣除
  const creditsCost = provider.credits_cost ?? 0;
  if (creditsCost > 0 && !options?.skipCreditsCheck) {
    if (!options?.userId) {
      throw new Error("需要消耗算力的操作必须提供 userId");
    }

    // 先检查余额是否足够
    const hasEnough = await checkCredits(options.userId, creditsCost);
    if (!hasEnough) {
      throw new InsufficientCreditsError(creditsCost, 0);
    }

    // 扣除算力
    await consumeCredits({
      userId: options.userId,
      amount: creditsCost,
      description: `${providerType} - 图片生成 - ${provider.model}`,
      refType: "generation_log",
    });
  }

  // 记录详细的模型调用信息
  console.log('\n========== 图片生成模型调用信息 ==========');
  console.log(`Provider Type: ${providerType}`);
  console.log(`Provider Name: ${provider.provider_name}`);
  console.log(`Model: ${provider.model}`);
  console.log(`Base URL: ${provider.base_url}`);
  console.log(`API Key: ${provider.api_key ? `${provider.api_key.substring(0, 10)}...` : 'N/A'}`);
  console.log(`Priority: ${provider.priority}`);
  console.log(`Enabled: ${provider.enabled}`);
  console.log(`Credits Cost: ${creditsCost}`);
  console.log(`User ID: ${options?.userId || 'N/A'}`);
  console.log('==========================================\n');

  let result: ImageGenerationResult;

  // 根据 provider_name 选择不同的实现
  switch (provider.provider_name.toLowerCase()) {
    case "sd":
    case "stable-diffusion":
    case "automatic1111":
      // Stable Diffusion 不支持参考图（或需要其他方式处理）
      if (imageParams.referenceImageUrl) {
        console.warn('⚠️ Stable Diffusion 当前不支持参考图功能，将忽略参考图参数');
      }
      result = await callStableDiffusionAPI(provider.base_url, imageParams, provider.api_key, provider.model);
      break;

    case "comfyui":
      result = await callComfyUIAPI(provider.base_url, imageParams, provider.api_key);
      break;

    case "openai":
    case "dall-e":
    case "dalle":
      // OpenAI/Gemini 支持参考图
      result = await callOpenAIImageAPI(
        provider.base_url,
        provider.model || "dall-e-3",
        imageParams,
        provider.api_key
      );
      break;

    case "replicate":
      throw new Error("Replicate 支持暂未实现，请使用 SD 或 ComfyUI");

    default:
      throw new Error(
        `不支持的 provider_name: ${provider.provider_name}，请使用 sd, comfyui, openai 等`
      );
  }

  // 添加算力消耗信息到结果
  result.creditsCost = creditsCost;

  return result;
}
