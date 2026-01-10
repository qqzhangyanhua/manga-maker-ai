/**
 * Nine Grid Image Generator - 九宫格图片生成器
 * 将 9 个分镜组合成一张 3×3 九宫格布局的图片
 */

import { callImageGenerationByType } from "./image-generation";

export interface NineGridPanel {
  id: string;
  panel_order: number;
  description: string;
  visual_prompt: string;
}

export interface NineGridImageParams {
  panels: NineGridPanel[];  // 必须恰好 9 个
  stylePrompt?: string;     // 风格提示词
  referenceImage?: string;  // 参考图 URL
  storyTitle?: string;
  genre?: string;
}

/**
 * 生成九宫格图片
 * 
 * 策略：
 * 1. 组合 9 个分镜的提示词
 * 2. 添加九宫格布局指令
 * 3. 调用图像生成 API
 * 4. 返回生成的图片 Buffer
 */
export async function generateNineGridImage(
  params: NineGridImageParams,
  userId?: string
): Promise<Buffer> {
  const { panels, stylePrompt, referenceImage, storyTitle, genre } = params;

  if (panels.length !== 9) {
    throw new Error(`必须提供恰好 9 个分镜，当前提供了 ${panels.length} 个`);
  }

  // 构建九宫格提示词
  const nineGridPrompt = buildNineGridPrompt(panels, {
    stylePrompt,
    referenceImage,
    storyTitle,
    genre,
  });

  console.log("九宫格提示词:", nineGridPrompt);

  // 调用图像生成 API
  try {
    const result = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: nineGridPrompt,
      negative_prompt: buildNegativePrompt(),
      width: 1536,  // 3×3 布局，每格 512px
      height: 1536,
      steps: 30,
      cfg_scale: 7,
      options: { userId },
    });

    // 检查生成结果
    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(result.error || "图像生成失败：未返回图片数据");
    }

    // 将 base64 转换为 Buffer
    const base64Image = result.images[0];
    // 移除 base64 前缀（如果有）
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, "base64");
  } catch (error) {
    console.error("九宫格图片生成失败:", error);
    throw error;
  }
}

/**
 * 构建九宫格提示词
 */
function buildNineGridPrompt(
  panels: NineGridPanel[],
  options: {
    stylePrompt?: string;
    referenceImage?: string;
    storyTitle?: string;
    genre?: string;
  }
): string {
  const { stylePrompt, referenceImage, storyTitle, genre } = options;

  // 基础九宫格布局指令
  let prompt = `3x3 grid layout, 9 panels storyboard, manga panels, sequential art, `;
  prompt += `comic book style, continuous narrative, `;

  // 添加风格
  if (stylePrompt) {
    prompt += `${stylePrompt}, `;
  }

  // 添加故事背景
  if (storyTitle && genre) {
    prompt += `${genre} story, `;
  }

  // 添加参考图指令
  if (referenceImage) {
    prompt += `consistent character design, same art style throughout, `;
    prompt += `reference image style, `;
  }

  // 添加每个分镜的描述
  prompt += `\n\nPanel descriptions:\n`;
  panels.forEach((panel, index) => {
    const position = `Panel ${index + 1} (${getGridPosition(index)}): `;
    prompt += `${position}${panel.visual_prompt}\n`;
  });

  // 添加一致性要求
  prompt += `\nConsistency requirements: `;
  prompt += `same characters throughout all panels, `;
  prompt += `consistent art style, `;
  prompt += `same color palette, `;
  prompt += `same lighting conditions, `;
  prompt += `continuous action flow, `;
  prompt += `clear spatial relationships, `;
  prompt += `professional storyboard quality`;

  return prompt;
}

/**
 * 获取网格位置描述
 */
function getGridPosition(index: number): string {
  const positions = [
    "top-left", "top-center", "top-right",
    "middle-left", "middle-center", "middle-right",
    "bottom-left", "bottom-center", "bottom-right"
  ];
  return positions[index] || "unknown";
}

/**
 * 构建负面提示词
 */
function buildNegativePrompt(): string {
  return [
    "inconsistent style",
    "different characters",
    "character mutation",
    "style changes",
    "color inconsistency",
    "bad anatomy",
    "deformed",
    "ugly",
    "blurry",
    "low quality",
    "watermark",
    "text",
    "signature",
  ].join(", ");
}

/**
 * 格式化九宫格信息为文本
 */
export function formatNineGridInfo(panels: NineGridPanel[]): string {
  return panels
    .map((panel, index) => {
      const position = getGridPosition(index);
      return `镜头 ${index + 1} (${position}):\n${panel.description}`;
    })
    .join("\n\n");
}
