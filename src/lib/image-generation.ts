/**
 * AI 图片生成服务封装
 * 支持多种图像生成服务:
 * - Stable Diffusion API (Automatic1111)
 * - OpenAI DALL-E (dall-e-2, dall-e-3)
 * - ComfyUI (暂未实现)
 * 复用 LLM Provider 架构，通过 provider_type 区分不同服务
 */

import { ensureLlmProvider } from "./llm-provider";

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
}

export interface ImageGenerationResult {
  success: boolean;
  images: string[]; // base64 encoded images
  info?: string;
  error?: string;
}

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
 *      height: 1024
 *    });
 */
export async function callImageGenerationByType(
  params: {
    providerType: string;
  } & ImageGenerationParams
): Promise<ImageGenerationResult> {
  const { providerType, ...imageParams } = params;

  // 查找配置
  const provider = await ensureLlmProvider(providerType);

  // 根据 provider_name 选择不同的实现
  switch (provider.provider_name.toLowerCase()) {
    case "sd":
    case "stable-diffusion":
    case "automatic1111":
      return await callStableDiffusionAPI(provider.base_url, imageParams, provider.api_key);

    case "comfyui":
      return await callComfyUIAPI(provider.base_url, imageParams, provider.api_key);

    case "openai":
    case "dall-e":
    case "dalle":
      return await callOpenAIImageAPI(
        provider.base_url,
        provider.model || "dall-e-3",
        imageParams,
        provider.api_key
      );

    case "replicate":
      throw new Error("Replicate 支持暂未实现，请使用 SD 或 ComfyUI");

    default:
      throw new Error(
        `不支持的 provider_name: ${provider.provider_name}，请使用 sd, comfyui, openai 等`
      );
  }
}

/**
 * 调用 Stable Diffusion (Automatic1111) API
 * API 文档: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API
 */
async function callStableDiffusionAPI(
  baseUrl: string,
  params: ImageGenerationParams,
  apiKey?: string
): Promise<ImageGenerationResult> {
  const {
    prompt,
    negative_prompt = "blurry, low quality, distorted, ugly, bad anatomy",
    width = 512,
    height = 512,
    steps = 20,
    cfg_scale = 7,
    sampler_name = "DPM++ 2M Karras",
    seed = -1,
    batch_size = 1,
  } = params;

  // 移除 base_url 末尾的斜杠
  const normalizedUrl = baseUrl.replace(/\/$/, "");
  const endpoint = `${normalizedUrl}/sdapi/v1/txt2img`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // 如果配置了 api_key，添加到请求头（某些 SD 部署需要认证）
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        negative_prompt,
        width,
        height,
        steps,
        cfg_scale,
        sampler_name,
        seed,
        batch_size,
        // SD 特定参数
        enable_hr: false, // 高分辨率修复
        denoising_strength: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Stable Diffusion API 调用失败: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data = await response.json();

    // SD 返回格式: { images: ["base64..."], info: "{...}" }
    return {
      success: true,
      images: data.images || [],
      info: data.info,
    };
  } catch (error) {
    console.error("Stable Diffusion API error:", error);
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 调用 OpenAI DALL-E API
 * API 文档: https://platform.openai.com/docs/api-reference/images/create
 */
async function callOpenAIImageAPI(
  baseUrl: string,
  model: string,
  params: ImageGenerationParams,
  apiKey?: string
): Promise<ImageGenerationResult> {
  const {
    prompt,
    width = 1024,
    height = 1024,
    batch_size = 1,
  } = params;

  if (!apiKey) {
    throw new Error("OpenAI API Key 未配置");
  }

  // DALL-E 支持的尺寸格式
  const size = `${width}x${height}`;

  // DALL-E 3 只支持特定尺寸: 1024x1024, 1792x1024, 1024x1792
  // DALL-E 2 支持: 256x256, 512x512, 1024x1024
  const validSizes = ["1024x1024", "1792x1024", "1024x1792", "512x512", "256x256"];
  if (!validSizes.includes(size)) {
    console.warn(`DALL-E 不支持尺寸 ${size}，使用默认 1024x1024`);
  }

  // 移除 base_url 末尾的斜杠
  const normalizedUrl = baseUrl.replace(/\/$/, "");
  const endpoint = `${normalizedUrl}/v1/images/generations`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: batch_size,
        size: validSizes.includes(size) ? size : "1024x1024",
        quality: model === "dall-e-3" ? "hd" : undefined,
        response_format: "b64_json", // 返回 base64 编码的图片
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API 调用失败: ${response.status} ${response.statusText}\n${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();

    // OpenAI 返回格式: { created: number, data: [{ b64_json: string }] }
    const images = data.data?.map((item: any) => item.b64_json) || [];

    return {
      success: true,
      images,
      info: JSON.stringify({ model, size: validSizes.includes(size) ? size : "1024x1024" }),
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 调用 ComfyUI API (TODO: 需要实现)
 */
async function callComfyUIAPI(
  baseUrl: string,
  params: ImageGenerationParams,
  apiKey?: string
): Promise<ImageGenerationResult> {
  // ComfyUI 的 API 调用较复杂，需要使用 workflow JSON
  // 这里先返回未实现的错误
  throw new Error("ComfyUI 支持暂未实现，请先使用 Stable Diffusion (Automatic1111)");
}

/**
 * 生成角色三视图（专用函数）
 * 
 * @param characterDescription 角色描述
 * @param providerType Provider 类型（默认 "image_generation"）
 * @returns 包含 front, side, back 三张图片的 base64
 */
export async function generateThreeViews(
  characterDescription: string,
  providerType: string = "image_generation"
): Promise<{
  front: string;
  side: string;
  back: string;
  prompts: {
    front: string;
    side: string;
    back: string;
  };
}> {
  // 构建三视图提示词
  const basePrompt = `${characterDescription}, character turnaround sheet, T-pose, clean white background, professional character design, anime style, full body, consistent appearance, ultra detailed, 8k`;
  
  const negativePrompt = `blurry, low quality, distorted, multiple characters, inconsistent style, cropped, background elements, text, watermark, signature`;

  const prompts = {
    front: `${basePrompt}, front view, facing camera`,
    side: `${basePrompt}, side view, 90 degree profile view, side angle`,
    back: `${basePrompt}, back view, rear view, from behind`,
  };

  // 生成三张图片
  const results = await Promise.all([
    callImageGenerationByType({
      providerType,
      prompt: prompts.front,
      negative_prompt: negativePrompt,
      width: 512,
      height: 768, // 3:4 比例，适合全身人物
      steps: 25,
      cfg_scale: 7.5,
    }),
    callImageGenerationByType({
      providerType,
      prompt: prompts.side,
      negative_prompt: negativePrompt,
      width: 512,
      height: 768,
      steps: 25,
      cfg_scale: 7.5,
    }),
    callImageGenerationByType({
      providerType,
      prompt: prompts.back,
      negative_prompt: negativePrompt,
      width: 512,
      height: 768,
      steps: 25,
      cfg_scale: 7.5,
    }),
  ]);

  // 检查是否所有生成都成功
  for (let i = 0; i < results.length; i++) {
    if (!results[i].success || results[i].images.length === 0) {
      throw new Error(
        `三视图生成失败（${["正面", "侧面", "背面"][i]}）: ${results[i].error || "未知错误"}`
      );
    }
  }

  return {
    front: results[0].images[0],
    side: results[1].images[0],
    back: results[2].images[0],
    prompts,
  };
}

/**
 * Base64 转 Buffer（用于上传到 MinIO）
 */
export function base64ToBuffer(base64: string): Buffer {
  // 移除 data:image/png;base64, 前缀（如果有）
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
}
