/**
 * POST /api/story/[id]/batch-generate-images
 * 第二步：批量为建议角色生成图片并保存到角色库
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import type { SuggestedCharacter, SuggestedCharactersData } from "@/types/suggested-characters.types";
import type { CharacterRole } from "@/components/StoryCharacter/types";

interface RequestBody {
  temp_ids: string[];
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
  let userId: string;

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
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 解析请求
    const body = (await req.json()) as RequestBody;
    const { temp_ids, auto_save = true, comic_style_id } = body;

    if (!temp_ids || !Array.isArray(temp_ids) || temp_ids.length === 0) {
      return NextResponse.json({ error: "temp_ids 不能为空" }, { status: 400 });
    }

    if (temp_ids.length > 5) {
      return NextResponse.json({ error: "最多同时生成 5 个角色" }, { status: 400 });
    }

    // 获取建议角色数据
    if (!story.suggested_characters) {
      return NextResponse.json({ error: "故事没有建议角色，请先运行角色分析" }, { status: 400 });
    }

    const suggestedData = story.suggested_characters as unknown as SuggestedCharactersData;
    const suggestedCharacters = suggestedData.characters;

    // 查找要生成的角色
    const charactersToGenerate = temp_ids
      .map((tempId) => suggestedCharacters.find((char) => char.temp_id === tempId))
      .filter((char): char is SuggestedCharacter => char !== undefined);

    if (charactersToGenerate.length !== temp_ids.length) {
      return NextResponse.json({ error: "部分 temp_id 无效" }, { status: 400 });
    }

    // 获取漫画风格
    const styleId = comic_style_id || suggestedData.comic_style_id || story.comic_style_id;
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

    // 获取当前故事角色的最大 display_order
    const maxOrderResult = await prisma.storyCharacter.aggregate({
      where: { story_id: storyId },
      _max: { display_order: true },
    });
    let nextDisplayOrder = (maxOrderResult._max.display_order || -1) + 1;

    // 并行生成图片
    const results = await Promise.all(
      charactersToGenerate.map(async (suggestedChar) => {
        try {
          // 构建图片生成提示词
          const imagePrompt = buildImagePrompt(suggestedChar.appearance, story.genre || "", comicStylePrompt);

          console.log(`[batch-generate] Generating image for ${suggestedChar.name}...`);

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
            throw new Error(imageResult.error ?? "图片生成失败");
          }

          const image_base64 = imageResult.images[0] ?? "";
          let character_id: string | null = null;

          // 如果 auto_save=true，保存到角色库
          if (auto_save) {
            // 创建 Character
            const character = await prisma.character.create({
              data: {
                user_id: userId,
                name: suggestedChar.name,
                description: suggestedChar.description,
                base_prompt: imagePrompt,
                tags: [suggestedChar.role],
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

              const imageUrl = getPublicUrl(objectName);

              // 更新 Character.base_image_url
              await prisma.character.update({
                where: { id: character.id },
                data: { base_image_url: imageUrl },
              });

              console.log(`[batch-generate] Uploaded image for ${suggestedChar.name}: ${imageUrl}`);
            } catch (uploadError) {
              console.error(`[batch-generate] Image upload failed for ${suggestedChar.name}:`, uploadError);
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
                role: suggestedChar.role,
                display_order: nextDisplayOrder++,
              },
            });

            console.log(`[batch-generate] Created character ${suggestedChar.name} (${character.id})`);
          }

          return {
            temp_id: suggestedChar.temp_id,
            success: true,
            image_base64,
            optimized_prompt: imagePrompt,
            character_id,
          };
        } catch (error) {
          console.error(`[batch-generate] Failed to generate ${suggestedChar.name}:`, error);
          return {
            temp_id: suggestedChar.temp_id,
            success: false,
            error: error instanceof Error ? error.message : "生成失败",
          };
        }
      })
    );

    // 更新 suggested_characters 状态
    const updatedCharacters = suggestedCharacters.map((char) => {
      const result = results.find((r) => r.temp_id === char.temp_id);
      if (result && result.success) {
        return {
          ...char,
          generated: true,
          character_id: result.character_id ?? null,
          generated_at: new Date().toISOString(),
          optimized_prompt: result.optimized_prompt,
        } as SuggestedCharacter;
      }
      return char;
    });

    const updatedData: SuggestedCharactersData = {
      ...suggestedData,
      characters: updatedCharacters,
    };

    await prisma.story.update({
      where: { id: storyId },
      data: {
        suggested_characters: updatedData as any,
      },
    });

    const savedCount = results.filter((r) => r.success && r.character_id).length;
    const totalCreditsUsed = results.filter((r) => r.success).length * 30; // 假设每张图片30 credits

    console.log(`[batch-generate] Completed: ${savedCount}/${temp_ids.length} saved`);
    console.log(`[batch-generate] Duration: ${Date.now() - startedAt}ms`);

    return NextResponse.json({
      success: true,
      results,
      saved_count: savedCount,
      credits_used: totalCreditsUsed,
    });
  } catch (error) {
    console.error("[batch-generate] Error:", error);

    if (error instanceof Error && "code" in error && error.code === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批量生成失败" },
      { status: 500 }
    );
  }
}
