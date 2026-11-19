import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import { addCanvasFinal, getAnchoredCanvasChapter, listChapterShots, refreshCanvasCounters } from "@/lib/canvas";
import { ApiError } from "@/lib/api-helpers";
import { addSpeechBubbles } from "@/lib/comic-panel-composer";
import { minioClient, MINIO_BUCKET, getPublicUrl } from "@/lib/minio";
import { PERFORMANCE } from "@/lib/config/comic-constants";

const FINAL_WIDTH = 800;
const FINAL_HEIGHT = 600;

export interface ShotInput {
  shot_id: string;
  shot_prompt: string;
  dialogue: string | null;
  character_names: string[];
  character_reference_images?: string[];
}

interface PanelProcessResult {
  success: boolean;
  finalId?: string;
  shotId: string;
  error?: string;
}

/** 章节的画布镜头（项目分镜）、所在剧本片段和角色信息；时间线未归属漫画项目时抛 409 */
export async function fetchChapterData(chapterId: string, userId: string) {
  const chapter = await getAnchoredCanvasChapter(prisma, chapterId, userId);
  const [timelineChapter, segments, allShots] = await Promise.all([
    prisma.timelineChapter.findUniqueOrThrow({
      where: { id: chapterId },
      select: { id: true, timeline_id: true, character_ids: true },
    }),
    prisma.scriptSegment.findMany({
      where: { timeline_chapter_id: chapterId },
      select: { id: true, dialogue: true, scene_description: true },
    }),
    listChapterShots(prisma, chapterId),
  ]);

  if (allShots.length === 0) {
    throw new ApiError("请先生成镜头设计", 400, "NO_SHOTS");
  }

  const segmentMap = new Map(segments.map((s) => [s.id, s]));
  const shotCharacterIds = allShots.flatMap((shot) => shot.character_ids);
  const chapterCharacterIds = timelineChapter.character_ids || [];
  const allCharacterIds = Array.from(new Set([...shotCharacterIds, ...chapterCharacterIds]));

  const characters = await prisma.character.findMany({
    where: { id: { in: allCharacterIds.filter((id) => !id.startsWith("unbound-")) }, user_id: userId },
    select: { id: true, name: true, base_image_url: true },
  });

  const characterMap = new Map(characters.map((c) => [c.id, c.name]));
  const characterImageMap = new Map(
    characters
      .filter((c) => c.base_image_url)
      .map((c) => [c.id, c.base_image_url as string])
  );

  return { chapter, timelineChapter, allShots, segmentMap, characterMap, characterImageMap, chapterCharacterIds };
}

export async function processComicPanels(
  panels: Array<{
    shot_id: string;
    generation_prompt: string;
    dialogue_layout?: { bubbles: Array<{ text: string; position: string; style: string }> };
  }>,
  shotInputs: ShotInput[],
  chapterId: string,
  userId: string
): Promise<PanelProcessResult[]> {
  const shotInputMap = new Map(shotInputs.map((s) => [s.shot_id, s]));

  const processingTasks = panels.map((panel) =>
    processSinglePanel(panel, shotInputMap.get(panel.shot_id), chapterId, userId)
  );

  const results: PanelProcessResult[] = [];
  for (let i = 0; i < processingTasks.length; i += PERFORMANCE.CONCURRENCY) {
    const batch = processingTasks.slice(i, i + PERFORMANCE.CONCURRENCY);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);

    logInfo("批次处理完成", {
      batch: Math.floor(i / PERFORMANCE.CONCURRENCY) + 1,
      processed: results.length,
      total: panels.length,
    });
  }

  return results;
}

export async function updateChapterStatus(
  chapterId: string,
  timelineId: string,
  results: PanelProcessResult[]
) {
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  await prisma.$transaction(async (tx) => {
    await tx.timelineChapter.update({
      where: { id: chapterId },
      data: { final_status: successCount > 0 ? "completed" : "error" },
    });
    await refreshCanvasCounters(tx, chapterId);
    const completedChapters = await tx.timelineChapter.count({
      where: { timeline_id: timelineId, final_status: "completed" },
    });
    await tx.canvasTimeline.update({
      where: { id: timelineId },
      data: { completed_chapters: completedChapters },
    });
  });

  logInfo("章节状态更新完成", {
    chapterId,
    successCount,
    failCount,
  });
}

async function processSinglePanel(
  panel: {
    shot_id: string;
    generation_prompt: string;
    dialogue_layout?: { bubbles: Array<{ text: string; position: string; style: string }> };
  },
  shotInput: ShotInput | undefined,
  chapterId: string,
  userId: string
): Promise<PanelProcessResult> {
  try {
    if (!shotInput) {
      return {
        success: false,
        shotId: panel.shot_id,
        error: "镜头数据不存在",
      };
    }

    // 直接从镜头 prompt 生成漫画图
    logInfo("开始生成漫画图", {
      shot_id: panel.shot_id,
      hasCharacters: shotInput.character_reference_images && shotInput.character_reference_images.length > 0,
      characterNames: shotInput.character_names,
    });

    const compositionPrompt = buildCompositionPrompt(
      panel.generation_prompt,
      shotInput.character_names
    );

    const { generateImage, waitForTaskCompletion } = await import("@/lib/unified-image-generation");

    const referenceImages = shotInput.character_reference_images || [];

    const { taskId } = await generateImage(
      "panel",
      compositionPrompt,
      userId,
      {
        width: FINAL_WIDTH,
        height: FINAL_HEIGHT,
        negativePrompt: "blurry, low quality, distorted, deformed, ugly, disfigured, bad anatomy",
        referenceImages,
        metadata: {
          panel_id: panel.shot_id,
          chapter_id: chapterId,
          type: "canvas_final",
          has_characters: referenceImages.length > 0,
        },
      }
    );

    const taskStatus = await waitForTaskCompletion(taskId, 120000);

    if (taskStatus.status !== "completed" || !taskStatus.imageUrl) {
      throw new Error(taskStatus.error || "图片生成失败");
    }

    const composedImageUrl = taskStatus.imageUrl;

    logInfo("漫画图生成成功", {
      shot_id: panel.shot_id,
      imageUrl: composedImageUrl,
    });

    let finalImageUrl: string = composedImageUrl;

    if (panel.dialogue_layout?.bubbles?.length) {
      logInfo("添加对话框", {
        shot_id: panel.shot_id,
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

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const objectName = `users/${userId}/canvas/finals/${chapterId}/${panel.shot_id}_${timestamp}_${randomStr}.png`;

      await minioClient.putObject(
        MINIO_BUCKET,
        objectName,
        imageBuffer,
        imageBuffer.length,
        { "Content-Type": "image/png" }
      );

      finalImageUrl = getPublicUrl(objectName);

      logInfo("对话框添加成功", {
        shot_id: panel.shot_id,
        imageUrl: finalImageUrl,
      });
    }

    const final = await addCanvasFinal(prisma, {
      panelId: panel.shot_id,
      imageUrl: finalImageUrl,
      prompt: panel.generation_prompt,
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      generationParams: { source: "generate_finals", chapter_id: chapterId },
    });

    return {
      success: true,
      finalId: final.id,
      shotId: panel.shot_id,
    };
  } catch (error) {
    // 失败不落记录，最终漫画只保存成功的图
    logError("漫画图处理失败", error, {
      shot_id: panel.shot_id,
    });

    return {
      success: false,
      shotId: panel.shot_id,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

function buildCompositionPrompt(
  basePrompt: string,
  characterNames: string[]
): string {
  const charactersPart = characterNames.length > 0
    ? `featuring characters: ${characterNames.join(", ")}`
    : "";

  return `comic panel, manga style, ${basePrompt}, ${charactersPart}, high quality, detailed illustration`
    .trim()
    .replace(/,\s*,/g, ",");
}
