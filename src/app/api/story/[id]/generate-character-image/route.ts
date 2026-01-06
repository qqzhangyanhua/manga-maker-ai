/**
 * POST /api/story/[id]/generate-character-image
 * 第二步（单个）：为单个建议角色生成图片并保存到角色库
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";

interface RequestBody {
  id: string; // SuggestedCharacter ID (not temp_id)
  auto_save?: boolean;
  comic_style_id?: string;
}

/**
 * 构建图片生成提示词
 */
function buildImagePrompt(appearance: string, genre: string, comicStylePrompt: string | null): string {
  const genreStyles: Record<string, string> = {
    suspense: "dark atmosphere, dramatic lighting, noir style",
    romance: "soft lighting, warm colors, elegant",
    adventure: "dynamic pose, action-ready, adventurous spirit",
    scifi: "futuristic, sci-fi elements, cyberpunk aesthetic",
    daily: "casual, everyday life, natural lighting",
    fantasy: "magical, fantasy elements, ethereal",
  };

  const genreStyle = genreStyles[genre] || "";
  const basePrompt = `${appearance}, character portrait, manga style, anime art, detailed face, high quality illustration, professional character design, clean background`;
  const styleModifiers = [genreStyle, comicStylePrompt].filter(Boolean).join(", ");

  return styleModifiers ? `${basePrompt}, ${styleModifiers}`.trim() : basePrompt;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const { id: storyId } = await params;

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
    userId = payload.userId;

    // 获取故事
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        user_id: true,
        genre: true,
        comic_style_id: true,
      },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 解析请求
    const body = (await req.json()) as RequestBody;
    const { id, auto_save = true, comic_style_id } = body;

    if (!id) {
      return NextResponse.json({ error: "id 不能为空" }, { status: 400 });
    }

    // 查询建议角色
    const suggestedCharacter = await prisma.suggestedCharacter.findUnique({
      where: { id },
    });

    if (!suggestedCharacter) {
      return NextResponse.json({ error: "建议角色不存在" }, { status: 404 });
    }

    if (suggestedCharacter.story_id !== storyId) {
      return NextResponse.json({ error: "建议角色不属于此故事" }, { status: 403 });
    }

    // 检查是否已生成
    if (suggestedCharacter.generated) {
      console.log(`[generate-character-image] Warning: Character ${suggestedCharacter.name} already generated`);
    }

    // 获取漫画风格
    const styleId = comic_style_id || story.comic_style_id;
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

    // 构建图片生成提示词
    const imagePrompt = buildImagePrompt(suggestedCharacter.appearance, story.genre || "", comicStylePrompt);

    console.log(`[generate-character-image] Generating image for ${suggestedCharacter.name}...`);

    // 调用图片生成
    const imageResult = await callImageGenerationByType({
      providerType: "image_generation",
      prompt: imagePrompt,
      negative_prompt:
        "blurry, low quality, distorted, deformed, ugly, bad anatomy, bad proportions, extra limbs, mutation, disfigured, watermark, text, signature",
      width: 512,
      height: 768,
      steps: 25,
      cfg_scale: 7.5,
      options: { userId },
    });

    if (!imageResult.success || !imageResult.images || imageResult.images.length === 0) {
      throw new Error(imageResult.error || "图片生成失败");
    }

    const image_base64 = imageResult.images[0];
    let character_id: string | null = null;
    let image_url: string | null = null;

    // 如果 auto_save=true，保存到角色库
    if (auto_save) {
      // 获取当前故事角色的最大 display_order
      const maxOrderResult = await prisma.storyCharacter.aggregate({
        where: { story_id: storyId },
        _max: { display_order: true },
      });
      const nextDisplayOrder = (maxOrderResult._max.display_order || -1) + 1;

      // 创建 Character
      const character = await prisma.character.create({
        data: {
          user_id: userId,
          name: suggestedCharacter.name,
          description: suggestedCharacter.description,
          base_prompt: imagePrompt,
          tags: [suggestedCharacter.role],
          training_status: "pending",
          comic_style_id: styleId || null,
        },
      });

      character_id = character.id;

      // 上传图片到 MinIO
      try {
        await ensureBucketExists();

        // 转换 base64 为 Buffer
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");

        // 生成对象名
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const objectName = `users/${userId}/characters/${character.id}/base_${timestamp}_${randomStr}.png`;

        // 上传到 MinIO
        await minioClient.putObject(MINIO_BUCKET, objectName, imageBuffer, imageBuffer.length, {
          "Content-Type": "image/png",
        });

        image_url = getPublicUrl(objectName);

        // 更新 Character.base_image_url
        await prisma.character.update({
          where: { id: character.id },
          data: { base_image_url: image_url },
        });

        console.log(`[generate-character-image] Uploaded image for ${suggestedCharacter.name}: ${image_url}`);
      } catch (uploadError) {
        console.error(`[generate-character-image] Image upload failed for ${suggestedCharacter.name}:`, uploadError);
        // 继续处理，即使上传失败
      }

      // 创建默认服装
      await prisma.characterOutfit.create({
        data: {
          character_id: character.id,
          outfit_type: "default",
          outfit_name: "默认装",
          is_default: true,
          prompt_modifier: "",
        },
      });

      // 创建 StoryCharacter 关联
      await prisma.storyCharacter.create({
        data: {
          story_id: storyId,
          character_id: character.id,
          role: suggestedCharacter.role,
          display_order: nextDisplayOrder,
        },
      });

      console.log(`[generate-character-image] Created character ${suggestedCharacter.name} (${character.id})`);
    }

    // 更新 SuggestedCharacter 记录
    await prisma.suggestedCharacter.update({
      where: { id: suggestedCharacter.id },
      data: {
        generated: true,
        character_id,
        image_url,
        optimized_prompt: imagePrompt,
        generated_at: new Date(),
      },
    });

    const creditsUsed = 30; // 假设每张图片30 credits

    console.log(`[generate-character-image] Completed: ${character_id ? "saved" : "not saved"}`);
    console.log(`[generate-character-image] Duration: ${Date.now() - startedAt}ms`);

    return NextResponse.json({
      success: true,
      id,
      image_base64,
      optimized_prompt: imagePrompt,
      character_id,
      image_url,
      credits_used: creditsUsed,
    });
  } catch (error) {
    console.error("[generate-character-image] Error:", error);

    if (error instanceof Error && "code" in error && error.code === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}
