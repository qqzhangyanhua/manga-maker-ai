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
    let chunkCount = 0;
    let totalBytes = 0;
    let lastLogTime = Date.now();

    console.log('\n========== 开始处理流式响应 ==========');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`✓ 流式响应读取完成，共 ${chunkCount} 个数据块，总大小: ${(totalBytes / 1024).toFixed(2)} KB`);
          break;
        }

        chunkCount++;
        totalBytes += value.length;

        // 每秒最多打印一次进度
        const now = Date.now();
        if (now - lastLogTime > 1000) {
          console.log(`  接收中... 数据块: ${chunkCount}, 已接收: ${(totalBytes / 1024).toFixed(2)} KB`);
          lastLogTime = now;
        }

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

              // 提取 delta.content 中的图片（支持多个 choices）
              const choices = data.choices || [];
              for (const choice of choices) {
                const content = choice?.delta?.content;
                if (!content) continue;

                // 方式 1: 匹配 base64 格式: ![image](data:image/png;base64,...)
                const base64Regex = /!\[.*?\]\(data:image\/[^;]+;base64,([^)]+)\)/g;
                let match;

                while ((match = base64Regex.exec(content)) !== null) {
                  const base64Data = match[1];
                  if (base64Data) {
                    images.push(base64Data);
                    console.log(`✓ 提取到图片 #${images.length} (choice ${choice.index})，大小: ${(base64Data.length / 1024).toFixed(2)} KB (base64)`);
                  }
                }

                // 方式 2: 匹配 URL 格式: ![image](https://...)
                const urlRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;
                while ((match = urlRegex.exec(content)) !== null) {
                  const imageUrl = match[1];
                  if (imageUrl && !imageUrl.startsWith('data:')) {
                    // 标记为 URL，稍后下载
                    images.push(`URL:${imageUrl}`);
                    console.log(`✓ 提取到图片 URL #${images.length} (choice ${choice.index}): ${imageUrl.substring(0, 80)}...`);
                  }
                }
              }
            } catch (parseError) {
              console.error("解析 SSE 数据失败:", parseError);
              console.error("问题行:", line.substring(0, 200));
            }
          }
        }
      }
    } catch (streamError) {
      console.error('\n========== 流式响应读取错误 ==========');
      console.error('错误类型:', streamError instanceof Error ? streamError.name : typeof streamError);
      console.error('错误消息:', streamError instanceof Error ? streamError.message : String(streamError));
      console.error('已接收数据块:', chunkCount);
      console.error('已接收字节:', totalBytes);
      console.error('已提取图片:', images.length);
      if (streamError instanceof Error && streamError.stack) {
        console.error('错误堆栈:', streamError.stack);
      }
      console.error('======================================\n');

      return {
        success: false,
        images: [],
        error: `流式响应读取失败: ${streamError instanceof Error ? streamError.message : '未知错误'}`,
      };
    } finally {
      reader.releaseLock();
    }

    console.log('======================================\n');

    if (images.length === 0) {
      console.error('\n⚠️ 未从响应中提取到图片数据');
      console.error(`接收到的数据块数: ${chunkCount}`);
      console.error(`接收到的总字节数: ${totalBytes}`);
      console.error(`最后的 buffer 内容 (前 500 字符):`, buffer.substring(0, 500));

      return {
        success: false,
        images: [],
        error: "未从响应中提取到图片数据",
      };
    }

    // 处理 URL 格式的图片：下载并转换为 base64
    console.log('\n========== 处理图片数据 ==========');
    const processedImages: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];

      if (imageData.startsWith('URL:')) {
        // URL 格式，需要下载
        const imageUrl = imageData.substring(4); // 移除 "URL:" 前缀
        console.log(`下载图片 #${i + 1}: ${imageUrl.substring(0, 80)}...`);

        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`下载失败: ${response.status} ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');

          processedImages.push(base64);
          console.log(`✓ 图片 #${i + 1} 下载成功，大小: ${(buffer.length / 1024).toFixed(2)} KB`);
        } catch (downloadError) {
          console.error(`✗ 图片 #${i + 1} 下载失败:`, downloadError);
          return {
            success: false,
            images: [],
            error: `下载图片失败: ${downloadError instanceof Error ? downloadError.message : '未知错误'}`,
          };
        }
      } else {
        // 已经是 base64 格式
        processedImages.push(imageData);
        console.log(`✓ 图片 #${i + 1} 已是 base64 格式，大小: ${(imageData.length / 1024).toFixed(2)} KB`);
      }
    }

    console.log(`✓ 所有图片处理完成，共 ${processedImages.length} 张`);
    console.log('==================================\n');

    return {
      success: true,
      images: processedImages,
      info: `成功生成 ${processedImages.length} 张图片`,
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
 * @param referenceImageUrl 参考图 URL（可选）
 * @returns 包含 front, side, back 三张图片的 base64
 */
/**
 * 生成角色视图（支持生成部分或全部视图）
 * @param characterDescription 角色描述
 * @param providerType 提供商类型
 * @param referenceImageUrl 参考图URL（可选）
 * @param viewTypes 要生成的视图类型数组，默认生成全部三个视图
 * @returns 生成的视图图片（base64）和对应的提示词
 */
export async function generateCharacterViews(
  characterDescription: string,
  providerType: string = "image_generation",
  referenceImageUrl?: string,
  viewTypes: string[] = ['front', 'side', 'back']
): Promise<{
  views: Record<string, string>;
  prompts: Record<string, string>;
}> {
  // 验证 viewTypes
  const validViewTypes = ['front', 'side', 'back'];
  const requestedViews = viewTypes.filter(v => validViewTypes.includes(v));

  if (requestedViews.length === 0) {
    throw new Error('至少需要指定一个有效的视图类型: front, side, back');
  }

  // 构建三视图提示词 - 根据是否有参考图采用不同策略
  let basePrompt: string;
  let negativePrompt: string;
  const allPrompts: Record<string, string> = {};

  if (referenceImageUrl) {
    // 【有参考图模式】提示词极简，强调严格遵循参考图
    console.log('\n========== 视图生成策略：参考图模式 ==========');
    console.log(`参考图: ${referenceImageUrl}`);
    console.log(`要生成的视图: ${requestedViews.join(', ')}`);
    console.log(`策略: 极简提示词，强调保持角色一致性`);
    console.log('==============================================\n');

    // 核心指令：必须与参考图一致
    const coreInstruction = [
      `IMPORTANT: You must draw the EXACT SAME character shown in the reference image.`,
      `Keep everything identical: face, facial features, body type, proportions, art style, colors, hair, eyes.`,
      `Character turnaround sheet, T-pose standing, full body, clean white background.`,
      `Do NOT change the character's appearance, face, or style.`
    ].join(" ");

    allPrompts.front = `${coreInstruction} Front view, facing forward, straight ahead, centered, symmetrical.`;
    allPrompts.side = `${coreInstruction} Side view, 90 degree profile, lateral view.`;
    allPrompts.back = `${coreInstruction} Back view, rear view, from behind.`;

    // 负面提示词：防止偏离参考图
    negativePrompt = `different character, altered face, changed facial features, different body type, different art style, modified proportions, different person, multiple characters, inconsistent style, different poses, sitting, action pose, blurry, low quality, bad anatomy, cropped, background elements, text, watermark`;
  } else {
    // 【无参考图模式】需要详细描述
    console.log('\n========== 视图生成策略：纯文本模式 ==========');
    console.log(`角色描述: ${characterDescription}`);
    console.log(`要生成的视图: ${requestedViews.join(', ')}`);
    console.log(`策略: 详细提示词，包含画质和风格描述`);
    console.log('==============================================\n');

    basePrompt = `${characterDescription}, character turnaround reference sheet, T-pose standing, full body, clean white background, professional character design, anime style, consistent detailed appearance, sharp focus, high quality illustration, character model sheet, reference design`;

    allPrompts.front = `${basePrompt}, front view, facing forward, straight ahead, centered composition, symmetrical`;
    allPrompts.side = `${basePrompt}, side view, 90 degree profile, side angle, lateral view, side perspective`;
    allPrompts.back = `${basePrompt}, back view, rear view, from behind, backside, posterior view`;

    negativePrompt = `blurry, low quality, distorted, deformed, ugly, bad anatomy, multiple characters, inconsistent style, cropped, background elements, scenery, text, watermark, signature, logo, different poses, sitting, action pose`;
  }

  // 打印要生成的提示词
  console.log('\n========== 视图提示词 ==========');
  requestedViews.forEach(viewType => {
    console.log(`【${viewType === 'front' ? '正面' : viewType === 'side' ? '侧面' : '背面'}】`);
    console.log(allPrompts[viewType]);
    console.log('');
  });
  console.log('【负面提示词】');
  console.log(negativePrompt);
  console.log('==================================\n');

  // 并行生成请求的视图
  const generationPromises = requestedViews.map(viewType =>
    callImageGenerationByType({
      providerType,
      prompt: allPrompts[viewType],
      negative_prompt: negativePrompt,
      width: 512,
      height: 768, // 3:4 比例，适合全身人物
      steps: 25,
      cfg_scale: 7.5,
      referenceImageUrl,
    }).then(result => ({ viewType, result }))
  );

  const results = await Promise.all(generationPromises);

  // 处理结果
  const views: Record<string, string> = {};
  const prompts: Record<string, string> = {};

  for (const { viewType, result } of results) {
    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(`${viewType} 视图生成失败: ${result.error || '未从响应中提取到图片数据'}`);
    }
    views[viewType] = result.images[0];
    prompts[viewType] = allPrompts[viewType];
  }

  return { views, prompts };
}

/**
 * 生成三视图（保持向后兼容）
 * @deprecated 建议使用 generateCharacterViews 以获得更灵活的控制
 */
export async function generateThreeViews(
  characterDescription: string,
  providerType: string = "image_generation",
  referenceImageUrl?: string
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
  // 调用新的灵活函数，生成全部三个视图
  const result = await generateCharacterViews(
    characterDescription,
    providerType,
    referenceImageUrl,
    ['front', 'side', 'back']
  );

  // 转换返回格式以保持向后兼容
  return {
    front: result.views.front,
    side: result.views.side,
    back: result.views.back,
    prompts: {
      front: result.prompts.front,
      side: result.prompts.side,
      back: result.prompts.back,
    },
  };
}

/**
 * 生成角色姿势变体（专门用于生成特定姿势的角色图片）
 * 与 generateCharacterViews 不同：
 * - 不强制 T-pose 站姿
 * - 不排除动作姿势
 * - 专注于单一姿势的生成
 *
 * @param characterDescription 角色描述
 * @param poseDescription 姿势描述（如"思考姿势，一只手托着下巴"）
 * @param providerType 图片生成模型类型
 * @param referenceImageUrl 可选的参考图URL
 * @returns 生成的图片（base64）和使用的提示词
 */
export async function generatePoseVariant(
  characterDescription: string,
  poseDescription: string,
  providerType: string = "image_generation",
  referenceImageUrl?: string
): Promise<{
  image: string;
  prompt: string;
}> {
  console.log('\n========== 姿势变体生成 ==========');
  console.log(`角色描述: ${characterDescription}`);
  console.log(`姿势描述: ${poseDescription}`);
  console.log(`参考图: ${referenceImageUrl || '无'}`);
  console.log('====================================\n');

  let fullPrompt: string;
  let negativePrompt: string;

  if (referenceImageUrl) {
    // 【有参考图模式】参考三视图策略，强调保持角色一致性
    console.log('策略: 参考图模式 - 严格保持角色外观，仅改变姿势');

    // 核心指令：参考三视图的严格一致性要求
    const coreInstruction = [
      `IMPORTANT: You must draw the EXACT SAME character shown in the reference image.`,
      `Keep everything identical: face, facial features, body type, proportions, art style, colors, hair, eyes, clothing.`,
      `Do NOT change the character's appearance, face, style, or any visual details.`,
      `Only change: the pose/gesture of the character.`
    ].join(" ");

    fullPrompt = [
      coreInstruction,
      `Character pose: ${poseDescription}.`,
      `Full body shot, clean background, high quality, detailed, professional illustration.`
    ].join(' ');

    // 负面提示词：排除角色变化，但允许姿势变化
    negativePrompt = `different character, altered face, changed facial features, different body type, different art style, modified proportions, different person, different hair, different eyes, different clothing, multiple characters, inconsistent style, blurry, low quality, bad anatomy, cropped, text, watermark, signature`;

  } else {
    // 【无参考图模式】详细描述角色和姿势
    console.log('策略: 纯文本模式 - 详细描述角色和姿势');

    fullPrompt = [
      characterDescription,
      poseDescription,
      `full body shot, clean background,`,
      `professional character illustration, anime style,`,
      `detailed, high quality, sharp focus, consistent appearance`
    ].join(', ');

    // 只排除质量问题，不排除姿势变化
    negativePrompt = `multiple characters, blurry, low quality, distorted, deformed, ugly, bad anatomy, cropped, text, watermark, signature`;
  }

  console.log('\n========== 生成提示词 ==========');
  console.log('【正面提示】');
  console.log(fullPrompt);
  console.log('\n【负面提示】');
  console.log(negativePrompt);
  console.log('=================================\n');

  // 调用图片生成
  const result = await callImageGenerationByType({
    providerType,
    prompt: fullPrompt,
    negative_prompt: negativePrompt,
    width: 512,
    height: 768, // 3:4 比例，适合全身人物
    steps: 25,
    cfg_scale: 7.5,
    referenceImageUrl,
  });

  if (!result.success || !result.images || result.images.length === 0) {
    throw new Error(`姿势变体生成失败: ${result.error || '未从响应中提取到图片数据'}`);
  }

  console.log('✅ 姿势变体生成成功\n');

  return {
    image: result.images[0],
    prompt: fullPrompt,
  };
}

/**
 * 下载图片并转换为 base64
 * @param imageUrl 图片 URL
 * @returns base64 格式的图片数据（包含 data:image/...;base64, 前缀）
 */
async function urlToBase64(imageUrl: string): Promise<string> {
  const MAX_IMAGE_SIZE_MB = 3; // 最大 3MB
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

  try {
    console.log(`\n========== 下载参考图 ==========`);
    console.log(`URL: ${imageUrl}`);

    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`下载参考图失败: ${response.status} ${response.statusText}`);
    }

    // 检查 Content-Length（如果服务器提供）
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10);
      const sizeMB = sizeBytes / (1024 * 1024);
      console.log(`Content-Length: ${(sizeBytes / 1024).toFixed(2)} KB (${sizeMB.toFixed(2)} MB)`);

      if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
        throw new Error(
          `参考图过大 (${sizeMB.toFixed(2)} MB)，超过限制 ${MAX_IMAGE_SIZE_MB} MB。` +
          `大图片会导致请求超时或被服务器拒绝。请使用较小的图片或压缩后再使用。`
        );
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sizeMB = buffer.length / (1024 * 1024);

    console.log(`下载完成，实际大小: ${(buffer.length / 1024).toFixed(2)} KB (${sizeMB.toFixed(2)} MB)`);

    // 再次检查实际大小
    if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `参考图过大 (${sizeMB.toFixed(2)} MB)，超过限制 ${MAX_IMAGE_SIZE_MB} MB。` +
        `大图片会导致请求超时或被服务器拒绝。请使用较小的图片或压缩后再使用。`
      );
    }

    // 警告：接近限制
    if (buffer.length > MAX_IMAGE_SIZE_BYTES * 0.8) {
      console.warn(`⚠️ 警告: 参考图较大 (${sizeMB.toFixed(2)} MB)，接近 ${MAX_IMAGE_SIZE_MB} MB 限制，可能导致请求缓慢或失败`);
    }

    const base64 = buffer.toString('base64');

    // 从 URL 或 Content-Type 推断图片类型
    const contentType = response.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log(`✓ 参考图转换成功，base64 大小: ${(dataUrl.length / 1024).toFixed(2)} KB`);
    console.log('================================\n');

    return dataUrl;
  } catch (error) {
    console.error('\n========== 参考图下载失败 ==========');
    console.error('URL:', imageUrl);
    console.error('错误:', error instanceof Error ? error.message : String(error));
    console.error('====================================\n');
    throw new Error(`无法下载参考图: ${error instanceof Error ? error.message : '未知错误'}`);
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
