import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import { addSpeechBubbles } from "@/lib/comic-panel-composer";
import { minioClient, MINIO_BUCKET, getPublicUrl } from "@/lib/minio";
import { PERFORMANCE } from "@/lib/config/comic-constants";

export interface ShotInput {
  shot_id: string;
  shot_prompt: string;
  dialogue: string | null;
  character_names: string[];
  character_reference_images?: string[];
}

interface PanelProcessResult {
  success: boolean;
  panelId?: string;
  shotId: string;
  error?: string;
}

export async function fetchChapterData(chapterId: string, userId: string) {
  const timelineChapter = await prisma.timelineChapter.findUnique({
    where: { id: chapterId },
    include: {
      timeline: true,
      script_segments: {
        include: {
          shot_designs: {
            include: {
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

  // 检查是否有镜头设计（不再依赖场景图）
  const allShots = timelineChapter.script_segments.flatMap((s) => s.shot_designs);

  if (allShots.length === 0) {
    throw new Error("请先生成镜头设计");
  }

  const shotCharacterIds = Array.from(
    new Set(
      timelineChapter.script_segments.flatMap((s) =>
        s.shot_designs.flatMap((d) => d.character_ids || [])
      )
    )
  );

  const chapterCharacterIds = timelineChapter.character_ids || [];

  const allCharacterIds = Array.from(
    new Set([...shotCharacterIds, ...chapterCharacterIds])
  );

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

  return { timelineChapter, allShots, characterMap, characterImageMap, chapterCharacterIds };
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
      data: {
        final_status: successCount > 0 ? "completed" : "error",
        final_image_count: successCount,
      },
    });

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
        width: 800,
        height: 600,
        negativePrompt: "blurry, low quality, distorted, deformed, ugly, disfigured, bad anatomy",
        referenceImages,
        metadata: {
          shot_id: panel.shot_id,
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

    const comicPanel = await prisma.comicPanelResult.create({
      data: {
        shot_design_id: panel.shot_id,
        image_url: finalImageUrl,
        generation_prompt: panel.generation_prompt,
        status: "completed",
      },
    });

    return {
      success: true,
      panelId: comicPanel.id,
      shotId: panel.shot_id,
    };
  } catch (error) {
    logError("漫画图处理失败", error, {
      shot_id: panel.shot_id,
    });

    await prisma.comicPanelResult.create({
      data: {
        shot_design_id: panel.shot_id,
        image_url: "",
        generation_prompt: panel.generation_prompt,
        status: "error",
      },
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
