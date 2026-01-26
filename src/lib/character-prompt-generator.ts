/**
 * 角色身份证 Prompt 生成服务
 * 
 * 使用 LLM 为角色生成标准化的图像生成 Prompt
 */

import { callChatCompletionByType } from "@/lib/llm-provider";
import { DEFAULT_NEGATIVE_PROMPT, STYLE_PRESETS } from "@/types/character-prompt";

// 角色信息接口（从 NovelCharacter 或 Character 获取）
interface CharacterInfo {
  name: string;
  age?: number | null;
  gender?: string | null;
  appearance?: string | null;
  personality?: string | null;
  description?: string | null;
  background?: string | null;
}

// AI 生成的 Prompt 结构
interface GeneratedPromptParts {
  appearance_prompt: string;
  clothing_prompt: string;
  style_prompt: string;
  characteristic_prompt: string;
  negative_prompt: string;
}

// 默认画风
const DEFAULT_STYLE = STYLE_PRESETS[0].value; // "manga style, black and white"

/**
 * 生成角色身份证 Prompt 的系统提示词
 */
function getSystemPrompt(version: "base" | "variant", variantName?: string): string {
  const basePrompt = `你是专业的图像生成提示词工程师，擅长为 Stable Diffusion / DALL-E 等 AI 绘画工具生成高质量的角色描述提示词。

你的任务是根据给定的角色信息，生成标准化的英文 Prompt，用于 AI 图像生成。

## 输出要求

请按以下结构生成 JSON 格式的 Prompt：

{
  "appearance_prompt": "角色外貌描述（发型、发色、眼睛、脸型、身高、体型、肤色等）",
  "clothing_prompt": "角色服装描述（款式、颜色、配饰等）",
  "style_prompt": "画风描述（manga style / anime style / realistic 等）",
  "characteristic_prompt": "独特特征描述（疤痕、纹身、特殊配饰等，如果没有可以为空）",
  "negative_prompt": "负面提示词（避免出现的元素）"
}

## 格式规范

1. 所有 Prompt 必须使用英文
2. 使用逗号分隔的关键词格式
3. 关键词要具体、清晰、易于 AI 理解
4. 避免使用抽象词汇，优先使用视觉可描述的特征
5. 服装描述要详细，包括款式、颜色、材质
6. 如果角色没有明显的独特特征，characteristic_prompt 可以为空字符串

## 示例输出

{
  "appearance_prompt": "young woman, long silver hair, bright blue eyes, slender build, 170cm tall, fair skin, delicate facial features",
  "clothing_prompt": "white school uniform with blue trim, navy blue pleated skirt, red ribbon tie, white knee-high socks, black loafers",
  "style_prompt": "manga style, black and white, high contrast",
  "characteristic_prompt": "small mole under right eye, silver stud earrings",
  "negative_prompt": "blurry, low quality, deformed, extra limbs, bad anatomy, disfigured, poorly drawn face, mutation, ugly"
}`;

  if (version === "variant" && variantName) {
    return `${basePrompt}

## 特殊要求：变体版本

这是角色的【${variantName}】变体版本。请根据这个场景类型调整服装和造型：
- 保持角色的基本外貌特征不变
- 根据「${variantName}」场景调整 clothing_prompt
- 可以适当调整发型和配饰以符合场景
- style_prompt 保持一致

常见变体类型参考：
- 战斗装：护甲、武器配件、战斗服饰
- 正装：西装、礼服、正式场合服饰
- 休闲装：便装、运动装、日常服饰
- 校服：学生制服
- 泳装：泳衣、沙滩装
- 古装：古代服饰、历史风格服装`;
  }

  return basePrompt;
}

/**
 * 生成用户提示词
 */
function getUserPrompt(
  character: CharacterInfo,
  userGuidance?: string
): string {
  const parts: string[] = [];

  parts.push(`## 角色信息\n`);
  parts.push(`- 姓名：${character.name}`);

  if (character.age) {
    parts.push(`- 年龄：${character.age} 岁`);
  }

  if (character.gender) {
    parts.push(`- 性别：${character.gender}`);
  }

  if (character.appearance) {
    parts.push(`- 外貌描述：${character.appearance}`);
  }

  if (character.personality) {
    parts.push(`- 性格特点：${character.personality}`);
  }

  if (character.description) {
    parts.push(`- 角色简介：${character.description}`);
  }

  if (character.background) {
    parts.push(`- 背景故事：${character.background}`);
  }

  if (userGuidance) {
    parts.push(`\n## 用户补充说明\n${userGuidance}`);
  }

  parts.push(`\n请根据以上信息生成角色的 Prompt，输出严格的 JSON 格式。`);

  return parts.join("\n");
}

/**
 * 解析 LLM 返回的 JSON
 */
function parseGeneratedPrompt(content: string): GeneratedPromptParts {
  // 尝试从返回内容中提取 JSON
  let jsonStr = content;

  // 如果包含 markdown 代码块，提取其中的 JSON
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // 验证必需字段
    if (!parsed.appearance_prompt || !parsed.clothing_prompt || !parsed.style_prompt) {
      throw new Error("Missing required fields in generated prompt");
    }

    return {
      appearance_prompt: String(parsed.appearance_prompt || "").trim(),
      clothing_prompt: String(parsed.clothing_prompt || "").trim(),
      style_prompt: String(parsed.style_prompt || DEFAULT_STYLE).trim(),
      characteristic_prompt: String(parsed.characteristic_prompt || "").trim(),
      negative_prompt: String(parsed.negative_prompt || DEFAULT_NEGATIVE_PROMPT).trim(),
    };
  } catch (error) {
    console.error("Failed to parse LLM response:", content);
    throw new Error(`Failed to parse generated prompt: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * 拼接完整的 Prompt
 */
export function buildFullPrompt(parts: GeneratedPromptParts): string {
  const promptParts: string[] = [];

  if (parts.appearance_prompt) {
    promptParts.push(parts.appearance_prompt);
  }

  if (parts.clothing_prompt) {
    promptParts.push(parts.clothing_prompt);
  }

  if (parts.characteristic_prompt) {
    promptParts.push(parts.characteristic_prompt);
  }

  if (parts.style_prompt) {
    promptParts.push(parts.style_prompt);
  }

  return promptParts.join(", ");
}

/**
 * 生成角色身份证 Prompt
 * 
 * @param character 角色信息
 * @param version 版本类型（base 或 variant）
 * @param variantName 变体名称（仅 variant 版本需要）
 * @param userGuidance 用户补充的指导信息
 * @returns 生成的 Prompt 各部分及完整 Prompt
 */
export async function generateCharacterPrompt(
  character: CharacterInfo,
  version: "base" | "variant" = "base",
  variantName?: string,
  userGuidance?: string
): Promise<GeneratedPromptParts & { full_prompt: string }> {
  const systemPrompt = getSystemPrompt(version, variantName);
  const userPrompt = getUserPrompt(character, userGuidance);

  // 调用 LLM
  const response = await callChatCompletionByType({
    providerType: "prompt_optimizer", // 使用 prompt_optimizer 提供商
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 1000,
    options: { skipCreditsCheck: true }, // 角色身份证生成暂不消耗算力
  });

  if (!response.content) {
    throw new Error("LLM call failed: No content returned");
  }

  // 解析响应
  const parts = parseGeneratedPrompt(response.content);

  // 生成完整 Prompt
  const full_prompt = buildFullPrompt(parts);

  return {
    ...parts,
    full_prompt,
  };
}

/**
 * 基于现有模板生成变体 Prompt
 * 
 * @param baseTemplate 基础版模板
 * @param variantName 变体名称
 * @returns 变体版本的 Prompt
 */
export async function generateVariantFromBase(
  baseTemplate: {
    appearance_prompt: string;
    style_prompt: string;
    characteristic_prompt?: string | null;
    negative_prompt: string;
  },
  character: CharacterInfo,
  variantName: string
): Promise<GeneratedPromptParts & { full_prompt: string }> {
  const systemPrompt = `你是专业的图像生成提示词工程师。

你的任务是基于角色的基础外貌描述，生成【${variantName}】场景下的服装变体。

## 基础角色信息

外貌 Prompt: ${baseTemplate.appearance_prompt}
画风 Prompt: ${baseTemplate.style_prompt}
特征 Prompt: ${baseTemplate.characteristic_prompt || "无"}

## 要求

1. 保持外貌 Prompt 不变
2. 保持画风 Prompt 不变
3. 保持特征 Prompt 不变
4. 只修改服装 Prompt，使其符合【${variantName}】场景

## 输出格式

输出严格的 JSON 格式：
{
  "clothing_prompt": "新的服装描述"
}`;

  const userPrompt = `角色：${character.name}
场景：${variantName}

请生成适合该场景的服装 Prompt。`;

  const response = await callChatCompletionByType({
    providerType: "prompt_optimizer",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 500,
    options: { skipCreditsCheck: true },
  });

  if (!response.content) {
    throw new Error("LLM call failed: No content returned");
  }

  // 解析响应
  let jsonStr = response.content;
  const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  let clothingPrompt: string;
  try {
    const parsed = JSON.parse(jsonStr);
    clothingPrompt = String(parsed.clothing_prompt || "").trim();
  } catch {
    // 如果解析失败，使用整个响应作为服装描述
    clothingPrompt = jsonStr.trim();
  }

  const parts: GeneratedPromptParts = {
    appearance_prompt: baseTemplate.appearance_prompt,
    clothing_prompt: clothingPrompt,
    style_prompt: baseTemplate.style_prompt,
    characteristic_prompt: baseTemplate.characteristic_prompt || "",
    negative_prompt: baseTemplate.negative_prompt,
  };

  return {
    ...parts,
    full_prompt: buildFullPrompt(parts),
  };
}

/**
 * 验证 Prompt 格式
 */
export function validatePromptParts(parts: Partial<GeneratedPromptParts>): string[] {
  const errors: string[] = [];

  if (parts.appearance_prompt && parts.appearance_prompt.length > 2000) {
    errors.push("appearance_prompt 超过 2000 字符限制");
  }

  if (parts.clothing_prompt && parts.clothing_prompt.length > 2000) {
    errors.push("clothing_prompt 超过 2000 字符限制");
  }

  if (parts.style_prompt && parts.style_prompt.length > 500) {
    errors.push("style_prompt 超过 500 字符限制");
  }

  if (parts.characteristic_prompt && parts.characteristic_prompt.length > 1000) {
    errors.push("characteristic_prompt 超过 1000 字符限制");
  }

  if (parts.negative_prompt && parts.negative_prompt.length > 1000) {
    errors.push("negative_prompt 超过 1000 字符限制");
  }

  return errors;
}
