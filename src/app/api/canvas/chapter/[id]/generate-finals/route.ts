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
import { ApiError } from "@/lib/api-helpers";
import { canvasErrorResponse } from "@/lib/canvas/route-error";
import type { ShotInput } from "./helpers";
import { fetchChapterData, libraryCharacterIds, processComicPanels, updateChapterStatus } from "./helpers";

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
    const {
      timelineChapter,
      allShots,
      segmentMap,
      characterMap,
      characterImageMap,
      chapterCharacterIds,
      libraryIdByProjectCharacter,
    } = chapterData;

    logInfo("章节数据获取成功", {
      chapterId,
      shotCount: allShots.length,
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

    for (const shot of allShots) {
      // 如果镜头没有预设角色，需要 LLM 识别
      if (libraryCharacterIds(shot, libraryIdByProjectCharacter).length === 0) {
        const segment = segmentMap.get(shot.segment_id);
        shotsNeedingIdentification.push({
          shotId: shot.id,
          dialogue: segment?.dialogue ?? null,
          description: shot.description || segment?.scene_description || "",
        });
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

    // 3.3 构建镜头输入数据（直接从画布镜头生成，不依赖场景图）
    const shotInputs: ShotInput[] = allShots.map((shot) => {
      const segment = segmentMap.get(shot.segment_id);
      // 优先使用预设的角色，否则使用 LLM 识别的角色
      let effectiveCharacterIds = libraryCharacterIds(shot, libraryIdByProjectCharacter);
      if (effectiveCharacterIds.length === 0) {
        effectiveCharacterIds = identifiedCharactersMap.get(shot.id) || [];
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
        shot_id: shot.id,
        shot_prompt: shot.prompt || shot.description || segment?.scene_description || "",
        dialogue: segment?.dialogue ?? null,
        character_names: shotCharacterNames,
        character_reference_images: allReferenceImages,
      };
    });

    // 4. 调用 novel-backend 分析对话框布局（基于镜头信息）
    const dialogueLayoutResult = await client.generateFinals({
      scenes: shotInputs.map((shot) => ({
        scene_id: shot.shot_id,  // 后端要求的字段，画布里放分镜 ID
        shot_id: shot.shot_id,
        image_url: "",  // 不需要场景图 URL
        dialogue: shot.dialogue,
        character_names: shot.character_names,
      })),
      comic_style: "manga",
      add_speech_bubbles: true,
    });

    if (!dialogueLayoutResult.success || dialogueLayoutResult.panels.length === 0) {
      throw new Error("对话框布局分析返回空结果");
    }

    logInfo("对话框布局分析完成", {
      chapterId,
      panelCount: dialogueLayoutResult.panels.length,
    });

    // 5. 确保 MinIO bucket 存在
    await ensureBucketExists();

    // 6. 并行处理漫画面板（直接从镜头生成）
    const results = await processComicPanels(
      dialogueLayoutResult.panels.map((panel) => ({
        shot_id: panel.shot_id,
        generation_prompt: panel.generation_prompt,
        dialogue_layout: panel.dialogue_layout,
      })),
      shotInputs,
      chapterId,
      payload.userId
    );

    // 7. 使用事务更新数据库
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

    // 章节不存在、无权、未归属项目、还没有镜头：不改章节状态
    if (error instanceof ApiError) {
      return canvasErrorResponse(error, "生成最终图失败");
    }

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

