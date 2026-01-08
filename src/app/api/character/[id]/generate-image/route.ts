/**
 * POST /api/character/[id]/generate-image
 * 为已存在的角色生成图片（首次生成或重新生成），支持漫画风格选择
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";

interface RequestBody {
  comic_style_id?: string | null;  // 漫画风格ID
  custom_prompt?: string;          // 自定义提示词（可选）
}

/**
 * 构建图片生成提示词
 */
function buildImagePrompt(
  characterDescription: string,
  comicStylePrompt: string | null,
  customPrompt?: string
): string {
  // 如果提供了自定义提示词，优先使用
  if (customPrompt && customPrompt.trim()) {
    const styleModifier = comicStylePrompt ? `, ${comicStylePrompt}` : "";
    return `${customPrompt.trim()}${styleModifier}`;
  }

  // 否则使用角色描述
  const basePrompt = `${characterDescription}, character portrait, manga style, anime art, detailed face, high quality illustration, professional character design, clean background`;
  const styleModifier = comicStylePrompt ? `, ${comicStylePrompt}` : "";
  
  return `${basePrompt}${styleModifier}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: characterId } = await params;

    // 认证检查
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // 获取角色
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        user_id: true,
        name: true,
        description: true,
        base_prompt: true,
        base_image_url: true,
        reference_image: true,
        comic_style_id: true,
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    if (character.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此角色" }, { status: 403 });
    }

    // 解析请求
    const body = (await req.json()) as RequestBody;
    const { comic_style_id, custom_prompt } = body;

    // 获取漫画风格提示词
    const styleId = comic_style_id !== undefined ? comic_style_id : character.comic_style_id;
    let comicStylePrompt: string | null = null;

    if (styleId) {
      const comicStyle = await prisma.comicStyle.findUnique({
        where: { id: styleId },
        select: { prompt_prefix: true },
      });
      if (comicStyle && comicStyle.prompt_prefix) {
        comicStylePrompt = comicStyle.prompt_prefix;
      }
    }

    // 构建提示词
    const characterDescription = character.description || character.base_prompt || character.name;
    const finalPrompt = buildImagePrompt(characterDescription, comicStylePrompt, custom_prompt);

    console.log(`[generate-image] Generating image for ${character.name}...`);
    console.log(`[generate-image] Prompt: ${finalPrompt}`);

    // 生成图片
    const imageResult = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: finalPrompt,
      negative_prompt:
        "blurry, low quality, distorted, deformed, ugly, bad anatomy, bad proportions, extra limbs, mutation, disfigured, watermark, text, signature",
      width: 512,
      height: 768,
      steps: 25,
      cfg_scale: 7.5,
      options: { userId: payload.userId },
    });

    if (!imageResult.success || !imageResult.images || imageResult.images.length === 0) {
      throw new Error(imageResult.error || "图片生成失败");
    }

    const image_base64 = imageResult.images[0];

    // 上传到 MinIO 并更新角色
    let imageUrl: string | null = null;
    try {
      await ensureBucketExists();

      // 转换 base64 为 Buffer
      const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      // 生成对象名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const objectName = `users/${payload.userId}/characters/${character.id}/generated_${timestamp}_${randomStr}.png`;

      // 上传到 MinIO
      await minioClient.putObject(MINIO_BUCKET, objectName, imageBuffer, imageBuffer.length, {
        "Content-Type": "image/png",
      });

      imageUrl = getPublicUrl(objectName);

      // 更新角色的图片
      // 如果角色还没有任何图片，优先设置 base_image_url
      // 否则更新 reference_image
      const updateData: { reference_image?: string; base_image_url?: string } = {};
      
      if (!character.base_image_url && !character.reference_image) {
        // 角色完全没有图片，设置 base_image_url
        updateData.base_image_url = imageUrl;
      }
      
      // 总是更新 reference_image
      updateData.reference_image = imageUrl;

      await prisma.character.update({
        where: { id: characterId },
        data: updateData,
      });

      console.log(`[generate-image] Image saved for ${character.name}: ${imageUrl}`);
    } catch (uploadError) {
      console.error(`[generate-image] Image upload failed:`, uploadError);
      throw new Error("图片上传失败");
    }

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      image_base64,
      optimized_prompt: finalPrompt,
    });
  } catch (error) {
    console.error("[generate-image] Error:", error);

    // 处理配额超限错误
    if (error instanceof Error) {
      const err = error as Error & { code?: string; limit?: number; count?: number };
      if (err.code === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          {
            error: err.message,
            code: "QUOTA_EXCEEDED",
            limit: err.limit,
            used: err.count,
          },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成图片失败" },
      { status: 500 }
    );
  }
}
