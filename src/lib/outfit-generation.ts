/**
 * 服装生成服务（强化风格一致性）
 * 为角色生成不同服装的图片；严格参考角色图片的画风与人物面貌。
 * 
 * 核心原则：
 * 1. 有参考图时，参考图是绝对主导，提示词尽量简洁
 * 2. 只描述需要改变的内容（服装），不重复描述角色特征
 * 3. 避免过多修饰词和画质词，让模型专注于参考图
 */

import { callImageGenerationByType } from "./image-generation";

// 服装类型映射
export const OUTFIT_TYPES = {
  default: "默认装",
  school: "校服",
  battle: "战斗装",
  casual: "休闲装",
  formal: "正装",
  sleepwear: "睡衣",
  sports: "运动装",
  custom: "自定义",
} as const;

export type OutfitType = keyof typeof OUTFIT_TYPES;

// 服装提示词模板（极简，只描述服装核心特征）
const OUTFIT_PROMPTS: Record<OutfitType, string> = {
  default: "casual everyday clothes",
  school: "school uniform with blazer and tie",
  battle: "battle armor and combat gear",
  casual: "casual t-shirt and jeans",
  formal: "formal suit or elegant dress",
  sleepwear: "comfortable pajamas",
  sports: "athletic sportswear",
  custom: "custom outfit",
};

/**
 * 生成服装图片
 * @param characterDescription 角色简述（有参考图时可忽略）
 * @param outfitType 服装类型
 * @param outfitDescription 服装的具体描述（可选）
 * @param providerType Provider 类型（默认 image_generation）
 * @param referenceImageUrl 参考角色图片 URL（强烈建议提供）
 * @returns base64 编码的图片
 */
export async function generateOutfit(
  characterDescription: string,
  outfitType: OutfitType,
  outfitDescription?: string,
  providerType: string = "image_generation",
  referenceImageUrl?: string,
): Promise<string> {
  const outfitPrompt = OUTFIT_PROMPTS[outfitType];
  
  let fullPrompt: string;
  let negativePrompt: string;

  if (referenceImageUrl) {
    // 【有参考图模式】提示词极简，让模型专注于参考图
    // 核心思路：参考图已经在 messages 中作为 image_url 发送，提示词只需简短指令
    const customPart = outfitDescription ? `, details: ${outfitDescription}` : "";
    
    fullPrompt = [
      // 严格要求：必须按照参考图
      `IMPORTANT: You must draw the EXACT SAME character shown in the reference image.`,
      `Keep everything identical: face, body type, proportions, art style, colors.`,
      // 唯一改变：服装
      `Only change: outfit to ${outfitPrompt}${customPart}.`,
      // 构图要求
      `Full body view, standing pose, simple white background.`,
      // 再次强调
      `Do NOT change the character's appearance, style, or proportions.`
    ].join(" ");

    // 负面提示词也要简洁，专注于防止偏离
    negativePrompt = "different character, altered face, changed body type, different art style, modified proportions, different person, multiple characters, inconsistent style, blurry, low quality";
  } else {
    // 【无参考图模式】需要更详细的角色描述
    const customPart = outfitDescription ? `, ${outfitDescription}` : "";
    
    fullPrompt = [
      characterDescription,
      `wearing ${outfitPrompt}${customPart}`,
      `full body, standing pose, white background`,
      `character design, anime style, clean illustration`
    ].join(", ");

    negativePrompt = "blurry, low quality, bad anatomy, cropped, complex background, text, watermark, multiple characters";
  }

  // 观测提示（便于排查）
  console.log(`\n========== 服装生成提示词 ==========`);
  console.log(`服装类型: ${OUTFIT_TYPES[outfitType]}`);
  console.log(`有参考图: ${referenceImageUrl ? '是' : '否'}`);
  if (referenceImageUrl) {
    console.log(`参考图: ${referenceImageUrl}`);
  }
  console.log(`完整提示词:`);
  console.log(fullPrompt);
  console.log(`---`);
  console.log(`负面提示词:`);
  console.log(negativePrompt);
  console.log(`==================================\n`);

  // 调用图片生成 API
  const result = await callImageGenerationByType({
    providerType,
    prompt: fullPrompt,
    negative_prompt: negativePrompt,
    width: 512,
    height: 768, // 3:4 比例，适合全身人物
    steps: 25,
    cfg_scale: 7.5,
    referenceImageUrl, // 传递参考图URL，将被转换为base64发送给模型
  });

  if (!result.success || result.images.length === 0) {
    throw new Error(`服装生成失败（${OUTFIT_TYPES[outfitType]}）: ${result.error || '未知错误'}`);
  }

  return result.images[0];
}

/**
 * 使用队列系统生成服装 (异步)
 */
import { generateImage, waitForTaskCompletion } from "./unified-image-generation";

export async function generateOutfitAsync(
  characterDescription: string,
  outfitType: OutfitType,
  userId: string,
  outfitDescription?: string,
  wait: boolean = false,
  referenceImageUrl?: string,
): Promise<{ taskId: string; imageUrl?: string }> {
  const outfitPrompt = OUTFIT_PROMPTS[outfitType];
  
  let fullPrompt: string;
  let negativePrompt: string;

  if (referenceImageUrl) {
    // 有参考图：极简提示词，强调严格遵循参考图
    const customPart = outfitDescription ? `, details: ${outfitDescription}` : "";
    fullPrompt = [
      `IMPORTANT: You must draw the EXACT SAME character shown in the reference image.`,
      `Keep everything identical: face, body type, proportions, art style, colors.`,
      `Only change: outfit to ${outfitPrompt}${customPart}.`,
      `Full body view, standing pose, simple white background.`,
      `Do NOT change the character's appearance, style, or proportions.`
    ].join(" ");
    negativePrompt = "different character, altered face, changed body type, different art style, modified proportions, different person, multiple characters, inconsistent style, blurry, low quality";
  } else {
    // 无参考图
    const customPart = outfitDescription ? `, ${outfitDescription}` : "";
    fullPrompt = `${characterDescription}, wearing ${outfitPrompt}${customPart}, full body, standing pose, white background, character design`;
    negativePrompt = "blurry, low quality, bad anatomy, cropped, complex background, text, watermark, multiple characters";
  }

  const { taskId, status } = await generateImage(
    "outfit",
    fullPrompt,
    userId,
    {
      negativePrompt,
      width: 512,
      height: 768,
      metadata: { outfitType, characterDescription, outfitDescription, referenceImageUrl },
    }
  );

  if (wait) {
    const result = await waitForTaskCompletion(taskId, 60000);
    if (result.status === "completed") {
      return { taskId, imageUrl: result.imageUrl };
    } else if (result.status === "failed") {
      throw new Error(result.error || "Outfit generation failed");
    }
  }

  return { taskId, imageUrl: status.imageUrl };
}
