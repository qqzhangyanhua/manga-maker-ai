/**
 * Style Extractor - Extract visual style description from reference images using Vision LLM
 */

import { callChatCompletionByType } from "./llm-provider";

const STYLE_EXTRACTION_SYSTEM_PROMPT = `你是一位专业的艺术风格分析师，擅长从图片中提取和描述视觉风格特征。

任务：分析参考图片，提取其艺术风格特征，输出可用于 AI 绘图的风格描述。

关键要求：
1. **仅关注风格，忽略人物**：分析色彩、笔触、光影、构图、氛围等风格元素，完全忽略图片中的人物、角色或具体对象
2. **风格特征**：色调（暖/冷/中性）、饱和度、对比度、笔触（细腻/粗犷/平涂）、光影处理（柔和/硬朗）
3. **艺术流派**：如果可以识别，指出类似的艺术流派或画风（如赛璐璐、水彩、油画、扁平化等）
4. **氛围感受**：整体给人的感觉（温暖/冷峻/梦幻/写实等）
5. **输出格式**：简洁的英文关键词组合，适合作为 AI 绘图提示词

输出示例（仅供参考）：
"Soft watercolor style, pastel color palette, dreamy atmosphere, gentle lighting, delicate brush strokes"
"Bold cel-shaded style, high contrast, vibrant colors, sharp edges, anime aesthetic"
"Vintage oil painting style, warm earthy tones, textured brush work, dramatic chiaroscuro lighting"

请直接输出风格描述，不要包含任何解释或额外说明。`;

/**
 * Extract style description from a reference image URL
 * @param imageUrl - URL of the reference image
 * @param userId - Optional user ID for credits tracking
 * @returns Style description string
 */
export async function extractStyleFromImage(
  imageUrl: string,
  userId?: string
): Promise<string> {
  const userPrompt = `请分析这张参考图片的艺术风格，提取其视觉风格特征。记住：完全忽略图片中的人物或具体对象，只关注风格本身。

参考图片：${imageUrl}

请输出简洁的英文风格描述，适合用于 AI 绘图。`;

  const result = await callChatCompletionByType({
    providerType: "prompt_optimizer", // 使用 prompt_optimizer 或创建新的 style_analyzer
    messages: [
      { role: "system", content: STYLE_EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.3, // 低温度以获得更一致的输出
    maxTokens: 200,
    options: userId ? { userId } : { skipCreditsCheck: true },
  });

  return result.content.trim();
}

/**
 * Build final prompt by merging story style configurations
 * Priority: Reference Image Style > Comic Style > Character Style
 *
 * @param basePrompt - Base visual prompt for the panel
 * @param storyStyleConfig - Story-level style configuration
 * @param characterStylePrompt - Optional character-specific style prompt
 * @returns Final merged prompt
 */
export async function mergeStylePrompts(
  basePrompt: string,
  storyStyleConfig: {
    style_reference_image?: string | null;
    comic_style_prompt?: string | null;
  },
  characterStylePrompt?: string | null,
  userId?: string
): Promise<string> {
  const promptParts: string[] = [basePrompt];

  // Priority 1: Reference image style (highest)
  if (storyStyleConfig.style_reference_image) {
    const extractedStyle = await extractStyleFromImage(
      storyStyleConfig.style_reference_image,
      userId
    );
    promptParts.push(`[Style: ${extractedStyle}]`);
  }
  // Priority 2: Comic style prompt
  else if (storyStyleConfig.comic_style_prompt) {
    promptParts.push(`[Style: ${storyStyleConfig.comic_style_prompt}]`);
  }

  // Priority 3: Character style (lowest, only if no story-level style)
  if (!storyStyleConfig.style_reference_image && !storyStyleConfig.comic_style_prompt && characterStylePrompt) {
    promptParts.push(`[Character Style: ${characterStylePrompt}]`);
  }

  return promptParts.join(" ");
}
