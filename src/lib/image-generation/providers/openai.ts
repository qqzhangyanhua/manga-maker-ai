/**
 * OpenAI DALL-E / Gemini 提供商适配器
 * 支持流式响应，从 chat completions 接口提取图片
 * 支持参考图：将参考图作为 base64 图片一起发送
 */

import type { ImageGenerationParams, ImageGenerationResult } from "../types";
import { urlToBase64 } from "../utils";

/**
 * 调用 OpenAI DALL-E API 或兼容的图片生成 API（如 Gemini）
 * 支持流式响应，从 chat completions 接口提取图片
 * 支持参考图：将参考图作为 base64 图片一起发送
 */
export async function callOpenAIImageAPI(
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
    referenceImageUrls,
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

  // 合并参考图：优先使用 referenceImageUrls，否则使用 referenceImageUrl
  const allReferenceUrls: string[] = [];
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    allReferenceUrls.push(...referenceImageUrls);
  } else if (referenceImageUrl) {
    allReferenceUrls.push(referenceImageUrl);
  }

  // 如果有参考图，先下载并转换为 base64
  const referenceImagesBase64: string[] = [];
  if (allReferenceUrls.length > 0) {
    console.log(`开始处理 ${allReferenceUrls.length} 张参考图...`);
    for (const [index, url] of allReferenceUrls.entries()) {
      try {
        const base64 = await urlToBase64(url);
        referenceImagesBase64.push(base64);
        console.log(`✓ 参考图 ${index + 1}/${allReferenceUrls.length} 已转换为 base64`);
      } catch (error) {
        console.warn(`⚠️ 参考图 ${index + 1} 转换失败，跳过:`, error);
      }
    }
    console.log(`✓ 成功转换 ${referenceImagesBase64.length}/${allReferenceUrls.length} 张参考图`);
  }

  // 构建 content 数组
  const contentArray: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  // 如果有参考图，先放参考图
  for (const [index, base64Image] of referenceImagesBase64.entries()) {
    contentArray.push({
      type: "image_url",
      image_url: {
        url: base64Image,
      },
    });
    console.log(`  添加参考图 ${index + 1} 到请求 (${(base64Image.length / 1024).toFixed(2)} KB)`);
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
  console.log(`参考图数量: ${referenceImagesBase64.length}`);
  if (referenceImagesBase64.length > 0) {
    const totalSize = referenceImagesBase64.reduce((sum, img) => sum + img.length, 0);
    console.log(`参考图总大小: ${(totalSize / 1024).toFixed(2)} KB (base64)`);
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
    let accumulatedContent = ""; // 累积所有 delta.content 用于调试
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

                // 累积内容用于调试
                accumulatedContent += content;

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
      console.error(`累积的文本内容 (前 2000 字符):`, accumulatedContent.substring(0, 2000));
      console.error(`累积的文本内容长度:`, accumulatedContent.length);

      // 尝试检测其他可能的图片格式
      const possiblePatterns = [
        { name: 'base64 in JSON', pattern: /"data":\s*"([A-Za-z0-9+/=]{100,})"/ },
        { name: 'image_url in JSON', pattern: /"url":\s*"(https?:\/\/[^"]+)"/ },
        { name: 'b64_json', pattern: /"b64_json":\s*"([A-Za-z0-9+/=]{100,})"/ },
        { name: 'inline base64', pattern: /data:image\/[^;]+;base64,([A-Za-z0-9+/=]{100,})/ },
      ];

      for (const { name, pattern } of possiblePatterns) {
        const match = accumulatedContent.match(pattern);
        if (match) {
          console.log(`检测到可能的 ${name} 格式，匹配内容前 100 字符:`, match[1]?.substring(0, 100));
        }
      }

      return {
        success: false,
        images: [],
        error: "未从响应中提取到图片数据。模型可能不支持图片生成，或返回格式不兼容。",
      };
    }

    // 处理 URL 格式的图片：下载并转换为 base64
    console.log('\n========== 处理图片数据 ==========');
    const processedImages: string[] = [];

    // 获取代理配置
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; MangaMakerAI/1.0)',
    };

    // 如果有代理配置，记录日志
    if (proxyUrl) {
      console.log(`使用代理: ${proxyUrl}`);
    }

    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];

      if (imageData.startsWith('URL:')) {
        // URL 格式，需要下载
        const imageUrl = imageData.substring(4); // 移除 "URL:" 前缀
        console.log(`下载图片 #${i + 1}: ${imageUrl.substring(0, 80)}...`);

        try {
          // 使用动态导入来支持代理
          const response = await (async () => {
            if (proxyUrl) {
              // 使用undici的fetch with dispatcher
              try {
                const { ProxyAgent, fetch: undiciFetch } = await import('undici');
                const dispatcher = new ProxyAgent(proxyUrl);
                return await undiciFetch(imageUrl, {
                  headers,
                  dispatcher,
                });
              } catch (importError) {
                console.warn('无法加载undici ProxyAgent，尝试使用原生fetch');
                return await fetch(imageUrl, { headers });
              }
            } else {
              // 不使用代理
              return await fetch(imageUrl, { headers });
            }
          })();

          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const base64 = buffer.toString('base64');

          processedImages.push(base64);
          console.log(`✓ 图片 #${i + 1} 下载成功，大小: ${(buffer.length / 1024).toFixed(2)} KB`);
        } catch (downloadError) {
          console.error(`✗ 图片 #${i + 1} 下载失败:`);
          console.error(`  URL: ${imageUrl}`);
          console.error(`  错误类型: ${downloadError instanceof Error ? downloadError.constructor.name : typeof downloadError}`);
          console.error(`  错误信息: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);

          // 提供更详细的错误信息
          let errorMessage = '图片URL无法访问';
          if (downloadError instanceof Error) {
            if (downloadError.message.includes('fetch failed') || downloadError.message.includes('ENOTFOUND')) {
              errorMessage = proxyUrl
                ? `图片URL无法访问（已配置代理: ${proxyUrl}）: ${imageUrl.substring(0, 100)}。请检查：1) 代理是否正常工作 2) 网络连接 3) URL是否有效`
                : `图片URL无法访问: ${imageUrl.substring(0, 100)}。可能原因：1) 需要配置代理（在.env中设置HTTP_PROXY） 2) 网络问题 3) URL已过期`;
            } else if (downloadError.message.includes('HTTP')) {
              errorMessage = `图片下载失败: ${downloadError.message}`;
            } else {
              errorMessage = `图片下载失败: ${downloadError.message}`;
            }
          }

          return {
            success: false,
            images: [],
            error: errorMessage,
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
