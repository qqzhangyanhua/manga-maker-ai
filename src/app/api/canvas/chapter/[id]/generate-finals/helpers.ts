import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import { addSpeechBubbles } from "@/lib/comic-panel-composer";
import { minioClient, MINIO_BUCKET, getPublicUrl } from "@/lib/minio";
import { PERFORMANCE } from "@/lib/config/comic-constants";

export interface SceneInput {
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

export async function fetchChapterData(chapterId: string, userId: string) {
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

  return { timelineChapter, allScenes, characterMap, characterImageMap, chapterCharacterIds };
}

export async function processComicPanels(
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
  const sceneInputMap = new Map(sceneInputs.map((s) => [s.scene_id, s]));

  const processingTasks = panels.map((panel) =>
    processSinglePanel(panel, allScenes, sceneInputMap.get(panel.scene_id), chapterId, userId)
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

    const characterReferenceImages = sceneInput?.character_reference_images || [];
    if (characterReferenceImages.length > 0) {
      logInfo("开始生成带角色的漫画图", {
        scene_id: panel.scene_id,
        referenceImageCount: characterReferenceImages.length,
        characterNames: sceneInput?.character_names || [],
      });

      const compositionPrompt = buildCompositionPrompt(
        panel.generation_prompt,
        sceneInput?.character_names || [],
        sceneImage.image_url
      );

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

function buildCompositionPrompt(
  basePrompt: string,
  characterNames: string[],
  sceneImageUrl: string
): string {
  const charactersPart = characterNames.length > 0
    ? `featuring characters: ${characterNames.join(", ")}`
    : "";

  return `comic panel, manga style, ${basePrompt}, ${charactersPart}, scene composition based on reference background, high quality, detailed illustration`
    .trim()
    .replace(/,\s*,/g, ",");
}
