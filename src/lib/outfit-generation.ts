/**
 * 服装生成服务
 * 为角色生成不同服装的图片
 */

import { callImageGenerationByType } from "./image-generation";

// 服装类型映射
export const OUTFIT_TYPES = {
  default: "默认装",
  school: "校服",
  battle: "战斗服",
  casual: "休闲装",
  formal: "正装",
  sleepwear: "睡衣",
  sports: "运动装",
  custom: "自定义",
} as const;

export type OutfitType = keyof typeof OUTFIT_TYPES;

// 服装提示词模板
const OUTFIT_PROMPTS: Record<OutfitType, string> = {
  default: "default outfit, standard clothing, casual wear",
  school: "school uniform, student outfit, blazer, tie, formal school attire",
  battle: "battle outfit, armor, combat gear, warrior costume, tactical clothing",
  casual: "casual clothing, comfortable wear, t-shirt, jeans, everyday outfit",
  formal: "formal wear, suit, dress, elegant clothing, business attire",
  sleepwear: "pajamas, sleepwear, nightgown, comfortable sleep clothing",
  sports: "sports outfit, athletic wear, gym clothes, sportswear",
  custom: "custom outfit, unique design, special clothing",
};

/**
 * 生成服装图片
 * 
 * @param characterDescription 角色描述
 * @param outfitType 服装类型
 * @param outfitDescription 服装的具体描述（可选）
 * @param providerType Provider 类型
 * @returns base64 编码的图片
 */
export async function generateOutfit(
  characterDescription: string,
  outfitType: OutfitType,
  outfitDescription?: string,
  providerType: string = "image_generation"
): Promise<string> {
  // 构建服装提示词
  const outfitPrompt = OUTFIT_PROMPTS[outfitType];
  const customDescription = outfitDescription ? `, ${outfitDescription}` : "";
  
  const fullPrompt = `${characterDescription}, ${outfitPrompt}${customDescription}, full body, character design, anime style, clean white background, professional character design, detailed clothing, 8k, ultra detailed`;
  
  const negativePrompt = `blurry, low quality, distorted, multiple characters, inconsistent style, cropped, background elements, text, watermark, signature, multiple outfits`;

  // 调用图片生成 API
  const result = await callImageGenerationByType({
    providerType,
    prompt: fullPrompt,
    negative_prompt: negativePrompt,
    width: 512,
    height: 768, // 3:4 比例，适合全身人物
    steps: 25,
    cfg_scale: 7.5,
  });

  if (!result.success || result.images.length === 0) {
    throw new Error(
      `服装生成失败（${OUTFIT_TYPES[outfitType]}）: ${result.error || "未知错误"}`
    );
  }

  return result.images[0];
}
