/**
 * Canvas Chapter Generate Finals API
 * POST /api/canvas/chapter/[id]/generate-finals - 生成最终漫画图
 *
 * ✅ 修复问题:
 * - 并行处理 (避免同步阻塞)
 * - 事务支持 (数据一致性)
 * - 速率限制 (防止滥用)
 * - 完整错误处理 (记录失败面板)
 * - 角色名称获取 (完整对话框布局)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNovelBackendClient, NovelBackendError } from "@/lib/novel-backend-client";
import { logInfo, logError } from "@/lib/api-logger";
import { addSpeechBubbles } from "@/lib/comic-panel-composer";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { PERFORMANCE } from "@/lib/config/comic-constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SceneInput {
  scene_id: string;
  shot_id: string;
  image_url: string;
  dialogue: string | null;
  character_names: string[];
  character_reference_images?: string[];
}

interface PanelProcessResult {
  success: boolean;
  panelId?: string;
  sceneId: string;
  shotId: string;
  error?: string;
}

export async function POST(req: Request, { params }: RouteParams) {
  const startedAt = Date.now();
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id: chapterId } = await params;

  // 速率限制: 每分钟最多 5 次
  const rateLimitResult = checkRateLimit(`generate-finals:${payload.userId}`, {
    window: 60000,
    max: 5,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: "请求过于频繁",
        detail: `请在 ${Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)} 秒后重试`,
        resetAt: rateLimitResult.resetAt,
      },
      { status: 429 }
    );
  }

  try {
    logInfo("开始生成最终漫画图", {
      endpoint: "/api/canvas/chapter/[id]/generate-finals",
      chapterId,
      userId: payload.userId,
    });

    // 1. 获取章节数据
    const chapterData = await fetchChapterData(chapterId, payload.userId);
    const { timelineChapter, allScenes, characterMap, characterImageMap, chapterCharacterIds } = chapterData;

    logInfo("章节数据获取成功", {
      chapterId,
      sceneCount: allScenes.length,
      characterCount: characterMap.size,
      characterImagesCount: characterImageMap.size,
      chapterCharacterCount: chapterCharacterIds.length,
    });

    // 2. 更新章节状态为生成中
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { final_status: "generating" },
    });

    // 初始化 novel-backend 客户端
    const client = getNovelBackendClient();

    // 3. 获取对话框布局分析
    // 获取章节绑定角色的参考图
    const chapterCharacterReferenceImages = chapterCharacterIds
      .map((id) => characterImageMap.get(id))
      .filter(Boolean) as string[];

    // 3.1 检查是否有镜头缺少角色信息，需要 LLM 识别
    const shotsNeedingIdentification: Array<{
      shotId: string;
      dialogue: string | null;
      description: string;
    }> = [];

    for (const segment of timelineChapter.script_segments) {
      for (const shotDesign of segment.shot_designs) {
        // 如果镜头没有预设角色，需要 LLM 识别
        if (!shotDesign.character_ids || shotDesign.character_ids.length === 0) {
          shotsNeedingIdentification.push({
            shotId: shotDesign.id,
            dialogue: segment.dialogue,
            description: shotDesign.shot_description || segment.scene_description,
          });
        }
      }
    }

    // 3.2 如果有需要识别的镜头，调用 LLM 批量识别
    const identifiedCharactersMap = new Map<string, string[]>();

    if (shotsNeedingIdentification.length > 0 && chapterCharacterIds.length > 0) {
      logInfo("开始 LLM 角色识别", {
        chapterId,
        shotsNeedingIdentification: shotsNeedingIdentification.length,
        availableCharacters: chapterCharacterIds.length,
      });

      try {
        // 获取章节角色的完整信息用于 LLM 识别
        const availableCharacters = await prisma.character.findMany({
          where: { id: { in: chapterCharacterIds } },
          select: { id: true, name: true, description: true },
        });

        const identificationResult = await client.batchIdentifyCharacters({
          shots: shotsNeedingIdentification.map(s => ({
            shot_id: s.shotId,
            dialogue: s.dialogue,
            description: s.description,
          })),
          available_characters: availableCharacters.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description || undefined,
          })),
        });

        // 将识别结果存入映射
        for (const [shotId, result] of Object.entries(identificationResult.results)) {
          if (result.matched_character_ids.length > 0) {
            identifiedCharactersMap.set(shotId, result.matched_character_ids);
          }
        }

        logInfo("LLM 角色识别完成", {
          chapterId,
          identifiedShots: identifiedCharactersMap.size,
          summary: identificationResult.summary,
        });
      } catch (error) {
        // 识别失败不阻塞流程，使用章节角色作为降级
        logError("LLM 角色识别失败，使用章节角色降级", error, { chapterId });
      }
    }

    const sceneInputs: SceneInput[] = timelineChapter.script_segments.flatMap((segment) =>
      segment.shot_designs.flatMap((shotDesign) =>
        shotDesign.scene_images.map((sceneImage) => {
          // 优先使用预设的角色，否则使用 LLM 识别的角色
          let effectiveCharacterIds = shotDesign.character_ids || [];
          if (effectiveCharacterIds.length === 0) {
            effectiveCharacterIds = identifiedCharactersMap.get(shotDesign.id) || [];
          }

          // 镜头指定的角色名称
          const shotCharacterNames = effectiveCharacterIds
            .map((id) => characterMap.get(id))
            .filter(Boolean) as string[];

          // 镜头角色的参考图（优先）+ 章节角色的参考图（补充）
          const shotCharacterImages = effectiveCharacterIds
            .map((id) => characterImageMap.get(id))
            .filter(Boolean) as string[];

          // 合并参考图：镜头角色 + 章节角色（去重）
          const allReferenceImages = Array.from(
            new Set([...shotCharacterImages, ...chapterCharacterReferenceImages])
          );

          return {
            scene_id: sceneImage.id,
            shot_id: shotDesign.id,
            image_url: sceneImage.image_url,
            dialogue: segment.dialogue,
            character_names: shotCharacterNames,
            character_reference_images: allReferenceImages,
          };
        })
      )
    );

    const finalsResult = await client.generateFinals({
      scenes: sceneInputs,
      comic_style: "manga",
      add_speech_bubbles: true,
    });

    if (!finalsResult.success || finalsResult.panels.length === 0) {
      throw new Error("漫画图生成返回空结果");
    }

    logInfo("对话框布局分析完成", {
      chapterId,
      panelCount: finalsResult.panels.length,
    });

    // 4. 确保 MinIO bucket 存在
    await ensureBucketExists();

    // 5. 并行处理漫画面板
    const results = await processComicPanels(
      finalsResult.panels,
      allScenes,
      sceneInputs,
      chapterId,
      payload.userId
    );

    // 6. 使用事务更新数据库
    await updateChapterStatus(
      chapterId,
      timelineChapter.timeline_id,
      results
    );

    const durationMs = Date.now() - startedAt;
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    logInfo("最终漫画图生成完成", {
      chapterId,
      userId: payload.userId,
      successCount,
      failCount,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      metadata: {
        panel_count: successCount,
        failed_count: failCount,
        duration_ms: durationMs,
        rate_limit: {
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        },
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logError("生成最终图失败", error, {
      chapterId,
      userId: payload.userId,
      durationMs,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { final_status: "error" },
    });

    if (error instanceof NovelBackendError) {
      return NextResponse.json(
        {
          error: "漫画图生成失败",
          detail: error.message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: "生成最终图失败",
        detail: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

// ==================== 辅助函数 ====================

/**
 * 获取章节数据和角色映射
 */
async function fetchChapterData(chapterId: string, userId: string) {
  const timelineChapter = await prisma.timelineChapter.findUnique({
    where: { id: chapterId },
    include: {
      timeline: true,
      script_segments: {
        include: {
          shot_designs: {
            include: {
              scene_images: true,
              script_segment: true,
            },
          },
        },
      },
    },
  });

  if (!timelineChapter) {
    throw new Error("章节不存在");
  }

  if (timelineChapter.timeline.user_id !== userId) {
    throw new Error("无权操作");
  }

  const allScenes = timelineChapter.script_segments.flatMap((s) =>
    s.shot_designs.flatMap((d) => d.scene_images)
  );

  if (allScenes.length === 0) {
    throw new Error("请先生成场景图");
  }

  // 获取所有角色名称 (来自镜头设计)
  const shotCharacterIds = Array.from(
    new Set(
      timelineChapter.script_segments.flatMap((s) =>
        s.shot_designs.flatMap((d) => d.character_ids || [])
      )
    )
  );

  // 获取章节绑定的角色 (用于参考图)
  const chapterCharacterIds = timelineChapter.character_ids || [];

  // 合并所有角色 ID
  const allCharacterIds = Array.from(
    new Set([...shotCharacterIds, ...chapterCharacterIds])
  );

  // 获取角色信息（包括 base_image_url）
  const characters = await prisma.character.findMany({
    where: { id: { in: allCharacterIds } },
    select: { id: true, name: true, base_image_url: true },
  });

  const characterMap = new Map(characters.map((c) => [c.id, c.name]));
  const characterImageMap = new Map(
    characters
      .filter((c) => c.base_image_url)
      .map((c) => [c.id, c.base_image_url as string])
  );

  return { timelineChapter, allScenes, characterMap, characterImageMap, chapterCharacterIds };
}

/**
 * 并行处理漫画面板
 */
async function processComicPanels(
  panels: Array<{
    scene_id: string;
    shot_id: string;
    generation_prompt: string;
    dialogue_layout?: { bubbles: Array<{ text: string; position: string; style: string }> };
  }>,
  allScenes: Array<{ id: string; image_url: string }>,
  sceneInputs: SceneInput[],
  chapterId: string,
  userId: string
): Promise<PanelProcessResult[]> {
  // 创建场景输入的快速查找映射
  const sceneInputMap = new Map(sceneInputs.map((s) => [s.scene_id, s]));

  const processingTasks = panels.map((panel) =>
    processSinglePanel(panel, allScenes, sceneInputMap.get(panel.scene_id), chapterId, userId)
  );

  // 并行处理 (每批最多 5 个)
  const results: PanelProcessResult[] = [];
  for (let i = 0; i < processingTasks.length; i += PERFORMANCE.CONCURRENCY) {
    const batch = processingTasks.slice(i, i + PERFORMANCE.CONCURRENCY);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);

    logInfo(`批次处理完成`, {
      batch: Math.floor(i / PERFORMANCE.CONCURRENCY) + 1,
      processed: results.length,
      total: panels.length,
    });
  }

  return results;
}

/**
 * 处理单个漫画面板
 * 流程：场景图（背景）+ 角色参考图 → AI 合成 → 添加对话框 = 最终图
 */
async function processSinglePanel(
  panel: {
    scene_id: string;
    shot_id: string;
    generation_prompt: string;
    dialogue_layout?: { bubbles: Array<{ text: string; position: string; style: string }> };
  },
  allScenes: Array<{ id: string; image_url: string }>,
  sceneInput: SceneInput | undefined,
  chapterId: string,
  userId: string
): Promise<PanelProcessResult> {
  try {
    const sceneImage = allScenes.find((s) => s.id === panel.scene_id);
    if (!sceneImage) {
      return {
        success: false,
        sceneId: panel.scene_id,
        shotId: panel.shot_id,
        error: "场景图不存在",
      };
    }

    let composedImageUrl: string = sceneImage.image_url;

    // 如果有角色参考图，使用 AI 生成合成图（场景 + 角色）
    const characterReferenceImages = sceneInput?.character_reference_images || [];
    if (characterReferenceImages.length > 0) {
      logInfo("开始生成带角色的漫画图", {
        scene_id: panel.scene_id,
        referenceImageCount: characterReferenceImages.length,
        characterNames: sceneInput?.character_names || [],
      });

      // 构建合成提示词：场景背景 + 角色描述
      const compositionPrompt = buildCompositionPrompt(
        panel.generation_prompt,
        sceneInput?.character_names || [],
        sceneImage.image_url
      );

      // 使用 unified-image-generation 生成带角色的漫画
      const { generateImage, waitForTaskCompletion } = await import("@/lib/unified-image-generation");

      const { taskId } = await generateImage(
        "panel",
        compositionPrompt,
        userId,
        {
          width: 800,
          height: 600,
          negativePrompt: "blurry, low quality, distorted, deformed, ugly, disfigured, bad anatomy",
          referenceImages: [sceneImage.image_url, ...characterReferenceImages],
          metadata: {
            scene_id: panel.scene_id,
            shot_id: panel.shot_id,
            chapter_id: chapterId,
            type: "canvas_final",
            has_characters: true,
          },
        }
      );

      // 等待图像生成完成
      const taskStatus = await waitForTaskCompletion(taskId, 120000);

      if (taskStatus.status === "completed" && taskStatus.imageUrl) {
        composedImageUrl = taskStatus.imageUrl;
        logInfo("带角色的漫画图生成成功", {
          scene_id: panel.scene_id,
          imageUrl: composedImageUrl,
        });
      } else {
        logError("带角色的漫画图生成失败，降级使用纯场景图", new Error(taskStatus.error || "Unknown"), {
          scene_id: panel.scene_id,
          taskStatus,
        });
      }
    }

    let finalImageUrl: string = composedImageUrl;

    // 如果有对话框，添加对话框
    if (panel.dialogue_layout?.bubbles?.length) {
      logInfo("添加对话框", {
        scene_id: panel.scene_id,
        bubbleCount: panel.dialogue_layout.bubbles.length,
      });

      const imageBuffer = await addSpeechBubbles(
        composedImageUrl,
        panel.dialogue_layout as {
          bubbles: Array<{
            text: string;
            position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
            style: "speech" | "thought" | "shout" | "whisper";
          }>;
        }
      );

      // 上传到 MinIO
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const objectName = `users/${userId}/canvas/finals/${chapterId}/${panel.scene_id}_${timestamp}_${randomStr}.png`;

      await minioClient.putObject(
        MINIO_BUCKET,
        objectName,
        imageBuffer,
        imageBuffer.length,
        { "Content-Type": "image/png" }
      );

      finalImageUrl = getPublicUrl(objectName);

      logInfo("对话框添加成功", {
        scene_id: panel.scene_id,
        imageUrl: finalImageUrl,
      });
    }

    // 保存到数据库
    const comicPanel = await prisma.comicPanelResult.create({
      data: {
        shot_design_id: panel.shot_id,
        scene_image_id: panel.scene_id,
        image_url: finalImageUrl,
        generation_prompt: panel.generation_prompt,
        status: "completed",
      },
    });

    return {
      success: true,
      panelId: comicPanel.id,
      sceneId: panel.scene_id,
      shotId: panel.shot_id,
    };
  } catch (error) {
    logError("漫画图处理失败", error, {
      scene_id: panel.scene_id,
      shot_id: panel.shot_id,
    });

    // 保存失败记录
    await prisma.comicPanelResult.create({
      data: {
        shot_design_id: panel.shot_id,
        scene_image_id: panel.scene_id,
        image_url: "",
        generation_prompt: panel.generation_prompt,
        status: "error",
      },
    });

    return {
      success: false,
      sceneId: panel.scene_id,
      shotId: panel.shot_id,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 构建场景+角色合成提示词
 */
function buildCompositionPrompt(
  basePrompt: string,
  characterNames: string[],
  sceneImageUrl: string
): string {
  const charactersPart = characterNames.length > 0
    ? `featuring characters: ${characterNames.join(", ")}`
    : "";

  return `comic panel, manga style, ${basePrompt}, ${charactersPart}, scene composition based on reference background, high quality, detailed illustration`.trim().replace(/,\s*,/g, ",");
}

/**
 * 使用事务更新章节状态
 */
async function updateChapterStatus(
  chapterId: string,
  timelineId: string,
  results: PanelProcessResult[]
) {
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  await prisma.$transaction(async (tx) => {
    // 更新章节状态
    await tx.timelineChapter.update({
      where: { id: chapterId },
      data: {
        final_status: successCount > 0 ? "completed" : "error",
        final_image_count: successCount,
      },
    });

    // 更新时间线统计
    if (successCount > 0) {
      await tx.canvasTimeline.update({
        where: { id: timelineId },
        data: {
          total_images: { increment: successCount },
          completed_chapters: { increment: 1 },
        },
      });
    }
  });

  logInfo("章节状态更新完成", {
    chapterId,
    successCount,
    failCount,
  });
}
