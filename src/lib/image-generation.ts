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
  referenceImageUrl?: string; // 参考图URL，将被转换为base64并发送给模型
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

  // 记录详细的模型调用信息
  console.log('\n========== 图片生成模型调用信息 ==========');
  console.log(`Provider Type: ${providerType}`);
  console.log(`Provider Name: ${provider.provider_name}`);
  console.log(`Model: ${provider.model}`);
  console.log(`Base URL: ${provider.base_url}`);
  console.log(`API Key: ${provider.api_key ? `${provider.api_key.substring(0, 10)}...` : 'N/A'}`);
  console.log(`Priority: ${provider.priority}`);
  console.log(`Enabled: ${provider.enabled}`);
  console.log('==========================================\n');

  // 根据 provider_name 选择不同的实现
  switch (provider.provider_name.toLowerCase()) {
    case "sd":
    case "stable-diffusion":
    case "automatic1111":
      // Stable Diffusion 不支持参考图（或需要其他方式处理）
      if (imageParams.referenceImageUrl) {
        console.warn('⚠️ Stable Diffusion 当前不支持参考图功能，将忽略参考图参数');
      }
      return await callStableDiffusionAPI(provider.base_url, imageParams, provider.api_key, provider.model);

    case "comfyui":
      return await callComfyUIAPI(provider.base_url, imageParams, provider.api_key);

    case "openai":
    case "dall-e":
    case "dalle":
      // OpenAI/Gemini 支持参考图
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

/**
 * 调用 OpenAI DALL-E API 或兼容的图片生成 API（如 Gemini）
 * 支持流式响应，从 chat completions 接口提取图片
 * 支持参考图：将参考图作为 base64 图片一起发送
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
    referenceImageUrl,
  } = params;

  if (!apiKey) {
    return {
      success: false,
      images: [],
      error: "OpenAI API Key 未配置",
    };
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
  const endpoint = `${normalizedUrl}/v1/chat/completions`;

  // 如果有参考图，先下载并转换为 base64
  let referenceImageBase64: string | undefined;
  if (referenceImageUrl) {
    try {
      referenceImageBase64 = await urlToBase64(referenceImageUrl);
      console.log('✓ 参考图已转换为 base64，将一起发送给模型');
    } catch (error) {
      console.warn('⚠️ 参考图转换失败，将不使用参考图:', error);
      // 继续执行，但不使用参考图
    }
  }

  // 构建 content 数组
  const contentArray: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  
  // 如果有参考图，先放参考图
  if (referenceImageBase64) {
    contentArray.push({
      type: "image_url",
      image_url: {
        url: referenceImageBase64,
      },
    });
  }
  
  // 然后放文本提示词
  contentArray.push({
    type: "text",
    text: prompt,
  });

  // 记录详细的 OpenAI API 调用信息
  console.log('\n========== OpenAI/DALL-E API 调用详情 ==========');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Model: ${model}`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`是否包含参考图: ${referenceImageBase64 ? '是' : '否'}`);
  if (referenceImageBase64) {
    console.log(`参考图大小: ${(referenceImageBase64.length / 1024).toFixed(2)} KB (base64)`);
  }
  console.log(`Prompt: ${prompt.substring(0, 100)}...`);
  console.log(`Size: ${size}`);
  console.log(`Batch Size: ${batch_size}`);
  console.log('================================================\n');

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: contentArray,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        stream: true, // 启用流式响应
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        images: [],
        error: `API 调用失败: ${response.status} ${response.statusText}\n${errorText}`,
      };
    }

    // 处理流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      return {
        success: false,
        images: [],
        error: "无法读取响应流",
      };
    }

    const decoder = new TextDecoder();
    let buffer = "";
    const images: string[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || line.trim() === "data: [DONE]") {
            continue;
          }

          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);

              // 提取 delta.content 中的图片
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                // 匹配 markdown 格式的 base64 图片: ![image](data:image/png;base64,...)
                const imageRegex = /!\[.*?\]\(data:image\/[^;]+;base64,([^)]+)\)/g;
                let match;
                
                while ((match = imageRegex.exec(content)) !== null) {
                  const base64Data = match[1];
                  if (base64Data) {
                    images.push(base64Data);
                  }
                }
              }
            } catch (parseError) {
              console.error("解析 SSE 数据失败:", parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (images.length === 0) {
      return {
        success: false,
        images: [],
        error: "未从响应中提取到图片数据",
      };
    }

    return {
      success: true,
      images,
      info: `成功生成 ${images.length} 张图片`,
    };
  } catch (error) {
    console.error("OpenAI/Gemini API error:", error);
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
  // 构建三视图提示词 - 参考专业角色设计规范
  const basePrompt = `${characterDescription}, character turnaround reference sheet, T-pose standing, full body, clean white background, professional character design, anime style, consistent detailed appearance, sharp focus, high quality illustration, character model sheet, reference design`;

  const negativePrompt = `blurry, low quality, distorted, deformed, ugly, bad anatomy, multiple characters, inconsistent style, cropped, background elements, scenery, text, watermark, signature, logo, different poses, sitting, action pose`;

  const prompts = {
    front: `${basePrompt}, front view, facing forward, straight ahead, centered composition, symmetrical`,
    side: `${basePrompt}, side view, 90 degree profile, side angle, lateral view, side perspective`,
    back: `${basePrompt}, back view, rear view, from behind, backside, posterior view`,
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
 * 下载图片并转换为 base64
 * @param imageUrl 图片 URL
 * @returns base64 格式的图片数据（包含 data:image/...;base64, 前缀）
 */
async function urlToBase64(imageUrl: string): Promise<string> {
  try {
    console.log(`下载参考图: ${imageUrl}`);
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`下载参考图失败: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    // 从 URL 或 Content-Type 推断图片类型
    const contentType = response.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${contentType};base64,${base64}`;
    
    console.log(`参考图下载成功，大小: ${(buffer.length / 1024).toFixed(2)} KB`);
    return dataUrl;
  } catch (error) {
    console.error('下载参考图失败:', error);
    throw new Error(`无法下载参考图 ${imageUrl}: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * Base64 转 Buffer（用于上传到 MinIO）
 */
export function base64ToBuffer(base64: string): Buffer {
  // 移除 data:image/png;base64, 前缀（如果有）
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
}
