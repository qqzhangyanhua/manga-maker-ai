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
    const { timelineChapter, allScenes, characterMap } = chapterData;

    logInfo("章节数据获取成功", {
      chapterId,
      sceneCount: allScenes.length,
      characterCount: characterMap.size,
    });

    // 2. 更新章节状态为生成中
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { final_status: "generating" },
    });

    // 3. 获取对话框布局分析
    const sceneInputs: SceneInput[] = timelineChapter.script_segments.flatMap((segment) =>
      segment.shot_designs.flatMap((shotDesign) =>
        shotDesign.scene_images.map((sceneImage) => ({
          scene_id: sceneImage.id,
          shot_id: shotDesign.id,
          image_url: sceneImage.image_url,
          dialogue: segment.dialogue,
          character_names: (shotDesign.character_ids || [])
            .map((id) => characterMap.get(id))
            .filter(Boolean) as string[],
        }))
      )
    );

    const client = getNovelBackendClient();
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

  // 获取所有角色名称
  const characterIds = Array.from(
    new Set(
      timelineChapter.script_segments.flatMap((s) =>
        s.shot_designs.flatMap((d) => d.character_ids || [])
      )
    )
  );

  const characters = await prisma.character.findMany({
    where: { id: { in: characterIds } },
    select: { id: true, name: true },
  });

  const characterMap = new Map(characters.map((c) => [c.id, c.name]));

  return { timelineChapter, allScenes, characterMap };
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
  chapterId: string,
  userId: string
): Promise<PanelProcessResult[]> {
  const processingTasks = panels.map((panel) =>
    processSinglePanel(panel, allScenes, chapterId, userId)
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
 */
async function processSinglePanel(
  panel: {
    scene_id: string;
    shot_id: string;
    generation_prompt: string;
    dialogue_layout?: { bubbles: Array<{ text: string; position: string; style: string }> };
  },
  allScenes: Array<{ id: string; image_url: string }>,
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

    let finalImageUrl: string;

    // 如果有对话框,添加对话框
    if (panel.dialogue_layout?.bubbles?.length) {
      logInfo("添加对话框", {
        scene_id: panel.scene_id,
        bubbleCount: panel.dialogue_layout.bubbles.length,
      });

      const imageBuffer = await addSpeechBubbles(
        sceneImage.image_url,
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
    } else {
      // 没有对话框,直接使用场景图
      finalImageUrl = sceneImage.image_url;
      logInfo("无对话框,使用原场景图", {
        scene_id: panel.scene_id,
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
