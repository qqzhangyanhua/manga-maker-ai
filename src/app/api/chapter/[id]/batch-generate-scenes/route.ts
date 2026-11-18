import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { callImageGenerationByType } from "@/lib/image-generation";
import { checkCredits, consumeCredits } from "@/lib/credits";
import { logInfo, logError } from "@/lib/api-logger";
import { uploadBase64Image } from "@/lib/upload-helpers";
import { buildSceneImagePrompt, SCENE_NEGATIVE_PROMPT, buildSceneName } from "@/lib/scene-prompt-builder";
import type { SceneGenerationResult } from "@/types/suggested-scenes.types";

interface BatchGenerateScenesRequestBody {
  ids: string[]; // SuggestedScene IDs (max 5)
  auto_save?: boolean; // Auto-save to Scene library (default: true)
  comic_style_id?: string; // Override comic style
  custom_style_prompt?: string; // Custom style prompt (overrides comic_style_id)
}

const CREDITS_PER_SCENE = 30; // Credits consumed per scene image
const MAX_BATCH_SIZE = 5; // Maximum scenes per batch

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userIdNullable: string | null = null;

  try {
    const chapterId = params.id;

    logInfo("Request received", {
      endpoint: "/api/chapter/[id]/batch-generate-scenes",
      method: "POST",
      chapterId
    });

    // Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const userId = payload.userId; // Non-null from this point
    userIdNullable = userId;

    logInfo("User authenticated", {
      endpoint: "/api/chapter/[id]/batch-generate-scenes",
      userId,
      chapterId
    });

    // Parse request body
    const body = (await req.json()) as BatchGenerateScenesRequestBody;
    const { ids, auto_save = true, comic_style_id, custom_style_prompt } = body;

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: "请选择至少一个场景" },
        { status: 400 }
      );
    }

    if (ids.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `最多同时生成 ${MAX_BATCH_SIZE} 个场景` },
        { status: 400 }
      );
    }

    logInfo("Request validated", {
      endpoint: "/api/chapter/[id]/batch-generate-scenes",
      userId,
      chapterId,
      sceneCount: ids.length,
      auto_save,
      selectedSceneIds: ids
    });

    // Fetch chapter and suggested scenes
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        project: {
          select: {
            id: true,
            user_id: true,
            comic_style_id: true,
            comic_style: {
              select: {
                id: true,
                name_zh: true,
                prompt_prefix: true
              }
            }
          }
        },
        suggested_scenes: {
          where: {
            id: { in: ids },
            generated: false
          }
        }
      }
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.project.user_id !== userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const suggestedScenes = chapter.suggested_scenes;

    logInfo("Found suggested scenes for generation", {
      endpoint: "/api/chapter/[id]/batch-generate-scenes",
      userId,
      chapterId,
      foundSceneCount: suggestedScenes.length,
      sceneNames: suggestedScenes.map(s => s.name),
      sceneTypes: suggestedScenes.map(s => s.scene_type)
    });

    if (suggestedScenes.length === 0) {
      return NextResponse.json(
        { error: "未找到可生成的场景" },
        { status: 404 }
      );
    }

    // Check credits
    const totalCost = suggestedScenes.length * CREDITS_PER_SCENE;
    const hasEnough = await checkCredits(userId, totalCost);
    if (!hasEnough) {
      return NextResponse.json(
        { error: `算力不足，需要 ${totalCost} 算力` },
        { status: 400 }
      );
    }

    logInfo("Starting batch scene generation", {
      endpoint: "/api/chapter/[id]/batch-generate-scenes",
      userId,
      chapterId,
      sceneCount: suggestedScenes.length,
      totalCost
    });

    // Get comic style prompt
    const styleId = comic_style_id || chapter.project.comic_style_id;
    let comicStylePrompt: string | null = null;

    // Custom prompt takes priority
    if (custom_style_prompt && custom_style_prompt.trim()) {
      comicStylePrompt = custom_style_prompt.trim();
      logInfo("Using custom style prompt", {
        endpoint: "/api/chapter/[id]/batch-generate-scenes",
        userId,
        chapterId,
        customPromptLength: comicStylePrompt.length
      });
    } else if (styleId) {
      const style = await prisma.comicStyle.findUnique({
        where: { id: styleId },
        select: { prompt_prefix: true }
      });
      comicStylePrompt = style?.prompt_prefix || null;

      logInfo("Comic style selected", {
        endpoint: "/api/chapter/[id]/batch-generate-scenes",
        userId,
        chapterId,
        styleId,
        hasStylePrompt: !!comicStylePrompt,
        stylePromptLength: comicStylePrompt?.length || 0
      });
    } else {
      logInfo("No comic style selected, using default", {
        endpoint: "/api/chapter/[id]/batch-generate-scenes",
        userId,
        chapterId
      });
    }

    // Generate images for all scenes
    const results: SceneGenerationResult[] = await Promise.allSettled(
      suggestedScenes.map(async (suggestedScene, index) => {
        const sceneStartTime = Date.now();

        try {
          logInfo("Starting scene generation", {
            endpoint: "/api/chapter/[id]/batch-generate-scenes",
            userId,
            sceneId: suggestedScene.id,
            sceneIndex: index + 1,
            totalScenes: suggestedScenes.length,
            sceneName: suggestedScene.name,
            sceneType: suggestedScene.scene_type
          });

          // Build image prompt
          const imagePrompt = buildSceneImagePrompt({
            basePrompt: suggestedScene.scene_prompt,
            comicStylePrompt,
            atmosphere: suggestedScene.atmosphere,
            lightingHint: suggestedScene.lighting_hint
          });

          logInfo("Image prompt built", {
            endpoint: "/api/chapter/[id]/batch-generate-scenes",
            userId,
            sceneId: suggestedScene.id,
            sceneName: suggestedScene.name,
            promptLength: imagePrompt.length,
            hasAtmosphere: !!suggestedScene.atmosphere,
            hasLighting: !!suggestedScene.lighting_hint
          });

          logInfo("Generating scene image", {
            endpoint: "/api/chapter/[id]/batch-generate-scenes",
            userId,
            sceneId: suggestedScene.id,
            sceneName: suggestedScene.name
          });

          const imageGenStartTime = Date.now();

          // Call image generation
          const imageResult = await callImageGenerationByType({
            providerType: "image_generation",
            prompt: imagePrompt,
            negative_prompt: SCENE_NEGATIVE_PROMPT,
            width: 1024,
            height: 768, // 4:3 landscape for backgrounds
            steps: 30,
            cfg_scale: 7.5,
            options: { userId }
          });

          const imageGenDuration = Date.now() - imageGenStartTime;

          logInfo("Image generation completed", {
            endpoint: "/api/chapter/[id]/batch-generate-scenes",
            userId,
            sceneId: suggestedScene.id,
            sceneName: suggestedScene.name,
            imageGenDurationMs: imageGenDuration,
            imageCount: imageResult.images?.length || 0
          });

          if (!imageResult.images || imageResult.images.length === 0) {
            throw new Error("图像生成失败：无返回结果");
          }

          // Upload to MinIO
          logInfo("Starting image upload to MinIO", {
            endpoint: "/api/chapter/[id]/batch-generate-scenes",
            userId,
            sceneId: suggestedScene.id,
            sceneName: suggestedScene.name
          });

          const uploadStartTime = Date.now();

          const sceneName = buildSceneName(
            chapter.chapter_order,
            index,
            suggestedScene.scene_type
          );
          const filename = `${sceneName}_${Date.now()}.png`;
          const imageUrl = await uploadBase64Image(
            imageResult.images[0],
            filename
          );

          const uploadDuration = Date.now() - uploadStartTime;

          logInfo("Scene image generated and uploaded", {
            endpoint: "/api/chapter/[id]/batch-generate-scenes",
            userId,
            sceneId: suggestedScene.id,
            imageUrl,
            uploadDurationMs: uploadDuration,
            filename
          });

          // Save to Scene library if auto_save
          let sceneRecord = null;
          if (auto_save) {
            logInfo("Saving scene to library", {
              endpoint: "/api/chapter/[id]/batch-generate-scenes",
              userId,
              sceneId: suggestedScene.id,
              sceneName: suggestedScene.name
            });

            sceneRecord = await prisma.scene.create({
              data: {
                user_id: userId,
                name: suggestedScene.name,
                description: suggestedScene.description,
                scene_type: suggestedScene.scene_type,
                image_url: imageUrl,
                prompt: imagePrompt,
                lighting_preset: suggestedScene.lighting_hint,
                source_chapter_id: chapterId,
                is_ai_generated: true,
                generation_cost: CREDITS_PER_SCENE,
                generation_params: {
                  prompt: imagePrompt,
                  negative_prompt: SCENE_NEGATIVE_PROMPT,
                  scene_prompt: suggestedScene.scene_prompt,
                  style: comicStylePrompt,
                  atmosphere: suggestedScene.atmosphere,
                  width: 1024,
                  height: 768
                }
              }
            });

            logInfo("Scene saved to library", {
              endpoint: "/api/chapter/[id]/batch-generate-scenes",
              userId,
              sceneId: sceneRecord.id,
              suggestedSceneId: suggestedScene.id,
              sceneName: sceneRecord.name
            });
          } else {
            logInfo("Skipping scene library save (auto_save=false)", {
              endpoint: "/api/chapter/[id]/batch-generate-scenes",
              userId,
              sceneId: suggestedScene.id
            });
          }

          // Update SuggestedScene status
          await prisma.suggestedScene.update({
            where: { id: suggestedScene.id },
            data: {
              generated: true,
              scene_id: sceneRecord?.id,
              image_url: imageUrl,
              optimized_prompt: imagePrompt,
              generated_at: new Date(),
              generation_cost: CREDITS_PER_SCENE
            }
          });

          logInfo("SuggestedScene status updated", {
            endpoint: "/api/chapter/[id]/batch-generate-scenes",
            userId,
            sceneId: suggestedScene.id,
            sceneName: suggestedScene.name,
            linkedSceneId: sceneRecord?.id
          });

          // Consume credits
          await consumeCredits({
            userId,
            amount: CREDITS_PER_SCENE,
            description: `生成场景背景：${suggestedScene.name}`,
            refType: "generation_log",
            refId: suggestedScene.id
          });

          const sceneTotalDuration = Date.now() - sceneStartTime;

          logInfo("Scene generation completed successfully", {
            endpoint: "/api/chapter/[id]/batch-generate-scenes",
            userId,
            sceneId: suggestedScene.id,
            sceneName: suggestedScene.name,
            creditsConsumed: CREDITS_PER_SCENE,
            totalDurationMs: sceneTotalDuration,
            imageGenDurationMs: imageGenDuration,
            uploadDurationMs: uploadDuration
          });

          return {
            suggested_scene_id: suggestedScene.id,
            success: true,
            scene_id: sceneRecord?.id,
            image_url: imageUrl,
            credits_used: CREDITS_PER_SCENE
          };
        } catch (error) {
          const sceneTotalDuration = Date.now() - sceneStartTime;

          logError("Scene generation failed", error, {
            endpoint: "/api/chapter/[id]/batch-generate-scenes",
            userId,
            sceneId: suggestedScene.id,
            sceneName: suggestedScene.name,
            sceneType: suggestedScene.scene_type,
            durationMs: sceneTotalDuration
          });

          return {
            suggested_scene_id: suggestedScene.id,
            success: false,
            error: error instanceof Error ? error.message : "生成失败"
          };
        }
      })
    ).then((results) =>
      results.map((result) =>
        result.status === "fulfilled"
          ? result.value
          : {
              suggested_scene_id: "",
              success: false,
              error: "Promise rejected"
            }
      )
    );

    // Calculate totals
    const successfulResults = results.filter((r) => r.success);
    const failedResults = results.filter((r) => !r.success);
    const totalCreditsUsed = successfulResults.reduce(
      (sum, r) => sum + (r.credits_used || 0),
      0
    );

    logInfo("Batch generation completed", {
      endpoint: "/api/chapter/[id]/batch-generate-scenes",
      userId,
      chapterId,
      totalScenes: results.length,
      successfulScenes: successfulResults.length,
      failedScenes: failedResults.length,
      successRate: `${Math.round((successfulResults.length / results.length) * 100)}%`,
      totalCreditsUsed,
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json({
      success: true,
      results,
      saved_count: successfulResults.length,
      total_credits_used: totalCreditsUsed
    });
  } catch (error) {
    logError("Batch scene generation failed", error, {
      endpoint: "/api/chapter/[id]/batch-generate-scenes",
      userId: userIdNullable || "unknown",
      durationMs: Date.now() - startedAt
    });

    return NextResponse.json(
      { error: "批量生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}
