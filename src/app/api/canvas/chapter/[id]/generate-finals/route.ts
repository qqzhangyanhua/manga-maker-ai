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
import { ensureBucketExists } from "@/lib/minio";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import type { SceneInput } from "./helpers";
import { fetchChapterData, processComicPanels, updateChapterStatus } from "./helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
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

