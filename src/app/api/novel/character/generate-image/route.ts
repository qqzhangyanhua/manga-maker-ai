/**
 * POST /api/novel/character/generate-image
 * 为小说角色生成基础图片并关联到资产库
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { callImageGenerationByType } from "@/lib/image-generation";
import { uploadBase64Image } from "@/lib/upload-helpers";
import { logInfo, logError } from "@/lib/api-logger";
import { pendingCharacterKey, promotePendingCharactersForNovel } from "@/lib/canvas";
import type {
  GenerateCharacterImageRequest,
  GenerateCharacterImageResponse,
} from "./types";

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    // 1. 身份验证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // 2. 解析请求体
    const body = (await req.json()) as GenerateCharacterImageRequest;
    const {
      novelProjectId,
      characterId,
      characterName,
      characterDescription,
      prompt,
      comicStyleId,
    } = body;

    // 验证必需字段
    if (!novelProjectId || !characterId || !characterName || !prompt) {
      return NextResponse.json(
        { error: "缺少必需字段：novelProjectId, characterId, characterName, prompt" },
        { status: 400 }
      );
    }

    logInfo("开始生成小说角色图片", {
      endpoint: "/api/novel/character/generate-image",
      userId: payload.userId,
      characterName,
      promptLength: prompt.length,
    });

    // 3. 验证项目所有权
    const project = await prisma.novelProject.findFirst({
      where: {
        id: novelProjectId,
        user_id: payload.userId,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 });
    }

    // 4. 检查是否已存在同名角色（自动关联）
    const existingCharacter = await prisma.character.findFirst({
      where: {
        user_id: payload.userId,
        name: characterName,
        source_type: "novel",
      },
    });

    let assetCharacter;
    let isNew = false;

    if (existingCharacter) {
      logInfo("发现已有同名角色，关联现有角色", {
        characterId: existingCharacter.id,
        characterName,
      });
      assetCharacter = existingCharacter;
    } else {
      // 5. 创建新 Character 记录
      assetCharacter = await prisma.character.create({
        data: {
          user_id: payload.userId,
          name: characterName,
          description: characterDescription,
          base_prompt: buildBasePrompt(characterDescription, prompt),
          comic_style_id: comicStyleId || null,
          training_status: "pending",
          source_type: "novel",
          source_reference: {
            novelProjectId,
            characterId,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      isNew = true;

      logInfo("创建新角色记录成功", {
        characterId: assetCharacter.id,
        characterName,
      });
    }

    // 6. 获取风格信息（如果指定）
    let stylePromptPrefix = "";
    if (comicStyleId) {
      const style = await prisma.comicStyle.findUnique({
        where: { id: comicStyleId },
        select: { prompt_prefix: true },
      });

      if (style?.prompt_prefix) {
        stylePromptPrefix = style.prompt_prefix;
      }
    }

    // 7. 构建完整提示词
    const fullPrompt = buildFullPrompt(prompt, stylePromptPrefix);

    logInfo("生成图片 - 提示词构建完成", {
      characterId: assetCharacter.id,
      promptLength: fullPrompt.length,
      hasStyle: !!stylePromptPrefix,
    });

    // 8. 调用图片生成 API（优先使用 character_generation，回退到 image_generation）
    let result;
    try {
      result = await callImageGenerationByType({
        providerType: "character_generation",
        prompt: fullPrompt,
        negative_prompt: buildNegativePrompt(),
        width: 512,
        height: 768,
        steps: 25,
        cfg_scale: 7.5,
        options: { userId: payload.userId },
      });
      logInfo("使用专用角色生成配置", { providerType: "character_generation" });
    } catch (error) {
      // 如果找不到 character_generation 配置，回退到 image_generation
      if (error instanceof Error && error.message.includes("未找到可用的模型配置")) {
        logInfo("未找到 character_generation 配置，回退到 image_generation", {
          originalError: error.message,
        });

        result = await callImageGenerationByType({
          providerType: "image_generation",
          prompt: fullPrompt,
          negative_prompt: buildNegativePrompt(),
          width: 512,
          height: 768,
          steps: 25,
          cfg_scale: 7.5,
          options: { userId: payload.userId },
        });
      } else {
        // 其他错误直接抛出
        throw error;
      }
    }

    if (!result.success || !result.images || result.images.length === 0) {
      throw new Error(result.error || "图片生成失败");
    }

    const imageBase64 = result.images[0];

    logInfo("图片生成API调用成功", {
      characterId: assetCharacter.id,
    });

    // 9. 上传到 MinIO
    const imageUrl = await uploadBase64Image(
      imageBase64,
      `characters/${assetCharacter.id}/base_image_${Date.now()}.png`
    );

    logInfo("图片上传MinIO成功", {
      characterId: assetCharacter.id,
      imageUrl,
    });

    // 10. 更新 Character.base_image_url
    await prisma.character.update({
      where: { id: assetCharacter.id },
      data: { base_image_url: imageUrl },
    });

    // 11. 更新 NovelProject.characters（添加 assetCharacterId 和 generatedImageUrl）
    const currentCharacters = (project.characters as Array<{
      id: string;
      name: string;
      role: string;
      description: string;
      traits?: string[];
      relationships?: Array<Record<string, string>>;
    }>) || [];

    // 找到当前更新的角色
    const currentCharacter = currentCharacters.find((c) => c.id === characterId);
    if (!currentCharacter) {
      throw new Error(`在项目中未找到角色 ID: ${characterId}`);
    }

    const updatedCharacters = currentCharacters.map((c) => {
      if (c.id === characterId) {
        return {
          ...c,
          assetCharacterId: assetCharacter.id,
          generatedImageUrl: imageUrl,
          lastGeneratedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    await prisma.novelProject.update({
      where: { id: novelProjectId },
      data: {
        characters: updatedCharacters as unknown as Prisma.InputJsonValue,
      },
    });

    // 镜头里这个人物的待绑定条目转为正式角色
    await promotePendingCharactersForNovel(prisma, {
      novelProjectId,
      userId: payload.userId,
      characterId: assetCharacter.id,
      pendingKeys: [pendingCharacterKey({ id: characterId, name: characterName })],
      name: characterName,
    });

    // 12. 返回响应（包含完整的更新后角色数据）
    const response: GenerateCharacterImageResponse = {
      success: true,
      assetCharacterId: assetCharacter.id,
      imageUrl,
      isNew,
      message: `成功为角色「${characterName}」生成图片`,
      updatedCharacter: {
        id: characterId,
        name: characterName,
        role: currentCharacter.role,
        description: characterDescription,
        generatedImageUrl: imageUrl,
        assetCharacterId: assetCharacter.id,
        lastGeneratedAt: new Date().toISOString(),
      },
    };

    logInfo("角色图片生成成功", {
      characterId: assetCharacter.id,
      isNew,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(response);
  } catch (error) {
    logError("生成角色图片失败", error, {
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: "生成图片失败，请稍后重试" },
      { status: 500 }
    );
  }
}

/**
 * 构建基础提示词
 */
function buildBasePrompt(description: string, customPrompt: string): string {
  const parts: string[] = [];

  if (description) {
    parts.push(description);
  }

  if (customPrompt && customPrompt !== description) {
    parts.push(customPrompt);
  }

  return parts.join(", ");
}

/**
 * 构建完整的图片生成提示词
 */
function buildFullPrompt(basePrompt: string, stylePrefix: string): string {
  const parts: string[] = [];

  // 基础提示词
  if (basePrompt) {
    parts.push(basePrompt);
  }

  // 风格前缀
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
