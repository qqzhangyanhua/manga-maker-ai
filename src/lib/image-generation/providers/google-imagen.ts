import type { ImageGenerationParams, ImageGenerationResult } from "../types";

/**
 * 根据宽高计算 Imagen 支持的宽高比
 */
function getAspectRatio(width?: number, height?: number): string {
  if (!width || !height) return "1:1";
  const ratio = width / height;
  if (ratio > 1.4) return "16:9";
  if (ratio > 1.1) return "4:3";
  if (ratio < 0.7) return "9:16";
  if (ratio < 0.9) return "3:4";
  return "1:1";
}

/**
 * Google Imagen 图像生成
 * 通过 Vertex AI 或 Generative AI API
 */
export async function callGoogleImagenAPI(
  baseUrl: string,
  params: ImageGenerationParams,
  apiKey: string,
  model: string
): Promise<ImageGenerationResult> {
  try {
    const modelName = model || "imagen-3.0-generate-002";
    const endpoint = `${baseUrl}/v1beta/models/${modelName}:predict`;

    const body = {
      instances: [
        {
          prompt: params.prompt,
        },
      ],
      parameters: {
        sampleCount: params.batch_size || 1,
        aspectRatio: getAspectRatio(params.width, params.height),
        negativePrompt: params.negative_prompt || "",
        ...(params.seed !== undefined ? { seed: params.seed } : {}),
      },
    };

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
        error: `Google Imagen API 错误 (${response.status}): ${error}`,
      };
    }

    const data = (await response.json()) as {
      predictions?: Array<{ bytesBase64Encoded?: string }>;
    };
    const images: string[] = [];

    if (data.predictions && Array.isArray(data.predictions)) {
      for (const pred of data.predictions) {
        if (pred.bytesBase64Encoded) {
          images.push(pred.bytesBase64Encoded);
        }
      }
    }

    return {
      success: images.length > 0,
      images,
      info: JSON.stringify({ model: modelName }),
    };
  } catch (error) {
    return {
      success: false,
      images: [],
      error: `Google Imagen 生成失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}
