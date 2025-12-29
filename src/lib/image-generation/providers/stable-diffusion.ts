/**
 * Stable Diffusion (Automatic1111) 提供商适配器
 * API 文档: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/API
 */

import type { ImageGenerationParams, ImageGenerationResult } from "../types";

/**
 * 调用 Stable Diffusion (Automatic1111) API
 */
export async function callStableDiffusionAPI(
  baseUrl: string,
  params: ImageGenerationParams,
  apiKey?: string,
  model?: string
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

  // 记录详细的 SD API 调用信息
  console.log('\n========== Stable Diffusion API 调用详情 ==========');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Model: ${model || 'default'}`);
  console.log(`Prompt: ${prompt.substring(0, 100)}...`);
  console.log(`Negative Prompt: ${negative_prompt.substring(0, 100)}...`);
  console.log(`Size: ${width}x${height}`);
  console.log(`Steps: ${steps}, CFG Scale: ${cfg_scale}`);
  console.log(`Sampler: ${sampler_name}, Seed: ${seed}`);
  console.log('==================================================\n');

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
