import type { ImageGenerationParams, ImageGenerationResult } from "../types";

/**
 * 火山引擎 Seedream 图像生成
 * 字节跳动的 AI 图像生成服务
 */
export async function callSeedreamAPI(
  baseUrl: string,
  params: ImageGenerationParams,
  apiKey: string,
  model: string
): Promise<ImageGenerationResult> {
  try {
    const endpoint = `${baseUrl}/v1/images/generations`;

    const body: Record<string, unknown> = {
      model: model || "seedream-3.0",
      prompt: params.prompt,
      negative_prompt: params.negative_prompt || "",
      width: params.width || 1024,
      height: params.height || 1024,
      n: params.batch_size || 1,
      response_format: "b64_json",
    };

    if (params.seed !== undefined) {
      body.seed = params.seed;
    }

    if (params.steps) {
      body.steps = params.steps;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        images: [],
        error: `Seedream API 错误 (${response.status}): ${error}`,
      };
    }

    const data = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
    };
    const images: string[] = [];

    if (data.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        if (item.b64_json) {
          images.push(item.b64_json);
        }
      }
    }

    return {
      success: images.length > 0,
      images,
      info: JSON.stringify({ model: model || "seedream-3.0" }),
    };
  } catch (error) {
    return {
      success: false,
      images: [],
      error: `Seedream 生成失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}
