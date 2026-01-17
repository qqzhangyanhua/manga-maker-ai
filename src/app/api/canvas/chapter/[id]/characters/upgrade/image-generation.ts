/**
 * 角色基础图片生成逻辑
 */

import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { uploadBase64ImageToMinio } from "@/lib/upload-helpers";
import { logInfo, logError } from "@/lib/api-logger";

export interface GenerateCharacterImageOptions {
  userId: string;
  characterId: string;
  comicStyleId?: string;
}

/**
 * 生成角色基础图片
 * @returns 图片URL
 */
export async function generateCharacterBaseImage(
  options: GenerateCharacterImageOptions
): Promise<string> {
  const { userId, characterId, comicStyleId } = options;

  // 1. 获取角色信息
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      comic_style: {
        select: {
          prompt_prefix: true,
          name_zh: true,
        },
      },
    },
  });

  if (!character) {
    throw new Error("角色不存在");
  }

  // 2. 如果指定了风格ID，获取风格信息
  let stylePromptPrefix = character.comic_style?.prompt_prefix || "";

  if (comicStyleId && comicStyleId !== character.comic_style_id) {
    const style = await prisma.comicStyle.findUnique({
      where: { id: comicStyleId },
      select: { prompt_prefix: true },
    });

    if (style?.prompt_prefix) {
      stylePromptPrefix = style.prompt_prefix;
    }
  }

  // 3. 构建提示词
  const prompt = buildCharacterPrompt({
    basePrompt: character.base_prompt,
    description: character.description,
    stylePrefix: stylePromptPrefix,
  });

  logInfo("生成角色图片 - 提示词构建完成", {
    characterId,
    promptLength: prompt.length,
    hasStyle: !!stylePromptPrefix,
  });

  // 4. 调用图片生成API
  const imageBase64 = await callImageGenerationByType({
    providerType: "character_generation",
    prompt,
    negativePrompt: buildNegativePrompt(),
    width: 512,
    height: 768,
    steps: 25,
    cfg: 7.5,
    options: { userId },
  });

  logInfo("图片生成API调用成功", {
    characterId,
  });

  // 5. 上传到MinIO
  const imageUrl = await uploadBase64ImageToMinio({
    base64: imageBase64,
    folder: `characters/${characterId}`,
    filename: `base_image_${Date.now()}.png`,
    userId,
  });

  logInfo("图片上传MinIO成功", {
    characterId,
    imageUrl,
  });

  return imageUrl;
}

/**
 * 构建角色生成提示词
 */
function buildCharacterPrompt(params: {
  basePrompt: string;
  description: string | null;
  stylePrefix: string;
}): string {
  const { basePrompt, description, stylePrefix } = params;

  const parts: string[] = [];

  // 基础提示词（必需）
  if (basePrompt) {
    parts.push(basePrompt);
  }

  // 描述（可选，避免重复）
  if (description && description !== basePrompt) {
    parts.push(description);
  }

  // 风格前缀（可选）
  if (stylePrefix) {
    parts.push(stylePrefix);
  }

  // 通用质量提示词
  parts.push(
    "character portrait",
    "full body",
    "white background",
    "high quality illustration",
    "professional character design",
    "detailed face",
    "clean lines"
  );

  return parts.join(", ");
}

/**
 * 构建负面提示词
 */
function buildNegativePrompt(): string {
  return [
    "blurry",
    "low quality",
    "distorted",
    "deformed",
    "ugly",
    "bad anatomy",
    "bad proportions",
    "extra limbs",
    "cloned face",
    "disfigured",
    "gross proportions",
    "malformed limbs",
    "missing arms",
    "missing legs",
    "extra arms",
    "extra legs",
    "fused fingers",
    "too many fingers",
    "long neck",
  ].join(", ");
}
