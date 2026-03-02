import type { ImageGenerationParams, ImageGenerationResult } from "../types";

/**
 * FAL AI 图像生成
 * 支持 Flux, SDXL 等多种模型
 * API: https://fal.ai/models
 */
export async function callFalAPI(
  baseUrl: string,
  params: ImageGenerationParams,
  apiKey: string,
  model: string
): Promise<ImageGenerationResult> {
  try {
    const endpoint = `${baseUrl}/fal-ai/${model}`;

    const body: Record<string, unknown> = {
      prompt: params.prompt,
      negative_prompt: params.negative_prompt || "",
      image_size: {
        width: params.width || 1024,
        height: params.height || 1024,
      },
      num_inference_steps: params.steps || 28,
      guidance_scale: params.cfg_scale || 7.5,
      num_images: params.batch_size || 1,
    };

    if (params.seed !== undefined) {
      body.seed = params.seed;
    }

    if (params.referenceImageUrl) {
      body.image_url = params.referenceImageUrl;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        images: [],
        error: `FAL API 错误 (${response.status}): ${error}`,
      };
    }

    const data = (await response.json()) as {
      images?: Array<{ url?: string }>;
      seed?: number;
    };

    const images: string[] = [];
    if (data.images && Array.isArray(data.images)) {
      for (const img of data.images) {
        if (img.url) {
          const imgResponse = await fetch(img.url);
          const buffer = await imgResponse.arrayBuffer();
          images.push(Buffer.from(buffer).toString("base64"));
        }
      }
    }

    return {
      success: images.length > 0,
      images,
      info: JSON.stringify({ model, seed: data.seed }),
    };
  } catch (error) {
    return {
      success: false,
      images: [],
      error: `FAL 图像生成失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}
