/**
 * Canvas Chapter Generate Shots API
 * POST /api/canvas/chapter/[id]/generate-shots - 生成镜头设计
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNovelBackendClient, NovelBackendError } from "@/lib/novel-backend-client";
import { logInfo, logError } from "@/lib/api-logger";
import {
  resolveCharactersForTimeline,
  formatForPlanShots,
} from "@/lib/canvas/character-resolver";
import {
  createCanvasShots,
  getAnchoredCanvasChapter,
  projectCharacterIdsOf,
  refreshCanvasCounters,
} from "@/lib/canvas";
import type { AnchoredCanvasChapter, NewCanvasShot } from "@/lib/canvas";
import { canvasErrorResponse } from "@/lib/canvas/route-error";

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

  // 镜头直接写成项目分镜：时间线必须已归属漫画项目
  let anchored: AnchoredCanvasChapter;
  try {
    anchored = await getAnchoredCanvasChapter(prisma, chapterId, payload.userId);
  } catch (error) {
    return canvasErrorResponse(error, "生成镜头失败");
  }

  try {
    logInfo("开始生成镜头", {
      endpoint: "/api/canvas/chapter/[id]/generate-shots",
      chapterId,
      userId: payload.userId,
    });

    const timelineChapter = await prisma.timelineChapter.findUniqueOrThrow({
      where: { id: chapterId },
      include: {
        script_segments: { orderBy: { segment_order: "asc" } },
      },
    });

    if (timelineChapter.script_segments.length === 0) {
      return NextResponse.json(
        { error: "请先生成剧本" },
        { status: 400 }
      );
    }

    logInfo("剧本片段获取成功", {
      chapterId,
      segmentCount: timelineChapter.script_segments.length,
    });

    // 查询关联角色（从 NovelProject.characters 获取已绑定的 Character 实体）
    const resolvedCharacters = await resolveCharactersForTimeline(
      timelineChapter.timeline_id,
      payload.userId
    );
    const availableCharacters = formatForPlanShots(resolvedCharacters);

    logInfo("角色解析完成", {
      chapterId,
      characterCount: availableCharacters.length,
      characterNames: availableCharacters.map((c) => c.name),
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { shot_status: "generating" },
    });

    // 调用 novel-backend 的镜头规划服务（并行优化）
    const client = getNovelBackendClient();
    // 先在内存里整理全部镜头（临时 key 用于角色识别），识别完再一次写入分镜
    const plannedShots: Array<NewCanvasShot & { key: string }> = [];

    logInfo("开始并行生成镜头", {
      chapterId,
      segmentCount: timelineChapter.script_segments.length,
    });

    // 并行为所有剧本片段生成镜头（性能优化：从串行改为并行）
    const shotResults = await Promise.all(
      timelineChapter.script_segments.map(async (segment) => {
        try {
          logInfo("为剧本片段生成镜头", {
            chapterId,
            segmentId: segment.id,
            segmentOrder: segment.segment_order,
          });

          const planResult = await client.planShots({
            script_content: segment.content,
            scene_description: segment.scene_description,
            character_actions: segment.character_actions,
            available_characters: availableCharacters,
          });

          if (!planResult.success || planResult.shots.length === 0) {
            logError("镜头规划返回空结果", new Error("Empty shots result"), {
              segmentId: segment.id,
            });
            return { segment, shots: [] };
          }

          logInfo("镜头规划完成", {
            segmentId: segment.id,
            shotCount: planResult.shots.length,
          });

          return { segment, shots: planResult.shots };
        } catch (error) {
          logError("片段镜头生成失败", error, {
            segmentId: segment.id,
          });
          return { segment, shots: [] };
        }
      })
    );

    /**
     * P3-3: 批量创建镜头记录
     * 
     * 提示词数据源优先级（从高到低）：
     * 1. 用户手动编辑的 prompt（通过 refine-prompt API 修改）
     * 2. 前端合成的 prompt（通过 compose-prompt API 生成）
     * 3. Python 后端生成的 prompt（当前阶段）
     * 4. 默认 fallback（camera_angle + shot_size）
     * 
     * 此阶段仅创建初始 prompt，后续可被覆盖
     */
    for (const { segment, shots } of shotResults) {
      shots.forEach((shot, index) => {
        const shotData = shot as unknown as Record<string, unknown>;

        // P3-3: 描述字段优先级
        const shotDescription =
          (typeof shotData.shot_description === "string" ? shotData.shot_description : undefined) ||
          (typeof shotData.action_description === "string" ? shotData.action_description : undefined) ||
          segment.scene_description ||
          `${typeof shotData.camera_angle === "string" ? shotData.camera_angle : ""} ${typeof shotData.shot_size === "string" ? shotData.shot_size : ""}`.trim();

        const locationKey = typeof shotData.location_key === "string" ? shotData.location_key : "";
        const descriptionSource = typeof shotData.shot_description === "string"
          ? "llm_shot_description"
          : typeof shotData.action_description === "string"
            ? "llm_action_description"
            : segment.scene_description
              ? "segment_scene_description"
              : "default_fallback";

        const shotOrder = typeof shotData.shot_order === "number" ? shotData.shot_order : index + 1;
        const cameraAngle = typeof shotData.camera_angle === "string" ? shotData.camera_angle : "";
        const shotSize = typeof shotData.shot_size === "string" ? shotData.shot_size : "";
        const compositionHint = typeof shotData.composition_hint === "string"
          ? shotData.composition_hint
          : typeof shotData.visual_notes === "string"
            ? shotData.visual_notes
            : "";

        // P3-3: 初始 prompt 来自 LLM 生成（优先级 3）
        const prompt = typeof shotData.prompt === "string"
          ? shotData.prompt
          : `${cameraAngle}, ${shotSize}`.trim();
        const negativePrompt = typeof shotData.negative_prompt === "string"
          ? shotData.negative_prompt
          : "blurry, low quality, distorted, text, watermark";
        const characterFocus = typeof shotData.character_focus === "string" ? shotData.character_focus : null;

        logInfo("P3-3: 整理镜头", {
          segmentId: segment.id,
          shotOrder,
          hasDescription: !!shotDescription,
          locationKey,
          descriptionSource, // 记录数据来源便于调试
          promptSource: typeof shotData.prompt === "string" ? "llm_generated" : "default_fallback",
        });

        plannedShots.push({
          key: `${segment.id}:${index}`,
          segmentId: segment.id,
          camera_angle: cameraAngle,
          shot_size: shotSize,
          panel_type: "medium",
          shot_description: shotDescription,
          composition_hint: compositionHint,
          location_key: locationKey,
          prompt,
          negative_prompt: negativePrompt,
          character_ids: characterFocus ? [characterFocus] : [],
        });
      });
    }

    // 批量识别角色：为每个镜头识别在场角色
    if (availableCharacters.length > 0 && plannedShots.length > 0) {
      logInfo("开始批量识别角色", {
        chapterId,
        shotCount: plannedShots.length,
        characterCount: availableCharacters.length,
      });

      try {
        const identificationResult = await client.batchIdentifyCharacters({
          shots: plannedShots.map((shot) => ({
            shot_id: shot.key,
            dialogue: null,
            description: shot.shot_description || "",
          })),
          available_characters: availableCharacters.map((c) => ({
            id: c.id,
            name: c.name,
            description: undefined,
          })),
        });

        const byKey = new Map(plannedShots.map((shot) => [shot.key, shot]));
        for (const [key, result] of Object.entries(identificationResult.results)) {
          const shot = byKey.get(key);
          if (shot && result.matched_character_ids.length > 0) {
            shot.character_ids = result.matched_character_ids;
          }
        }

        logInfo("批量角色识别完成", {
          chapterId,
          totalShots: identificationResult.summary.total_shots,
          shotsWithCharacters: identificationResult.summary.shots_with_characters,
        });
      } catch (error) {
        logError("批量角色识别失败，继续流程", error, { chapterId });
      }
    }

    // 写入项目分镜。未加入角色库的小说人物（unbound-xxx）记为待绑定，加入角色库后自动换成真实角色
    const pendingNames = new Map(
      resolvedCharacters.filter((c) => !c.isBound).map((c) => [c.id, c.name])
    );
    const allShots = await createCanvasShots(prisma, {
      chapter: anchored,
      userId: payload.userId,
      shots: plannedShots.map(({ key: _key, ...shot }) => shot),
      pendingNames,
    });
    const totalShots = allShots.length;
    const projectCharacterIds = projectCharacterIdsOf(allShots);
    const linkedCharacters = projectCharacterIds.length
      ? await prisma.projectCharacter.findMany({
          where: { id: { in: projectCharacterIds } },
          select: { character_id: true },
        })
      : [];
    const allChapterCharacterIds = new Set(linkedCharacters.map((row) => row.character_id));

    // 更新章节状态与统计
    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        shot_status: "completed",
        character_ids: Array.from(allChapterCharacterIds),
      },
    });
    await refreshCanvasCounters(prisma, chapterId);

    const durationMs = Date.now() - startedAt;
    logInfo("镜头生成成功", {
      chapterId,
      userId: payload.userId,
      shotCount: totalShots,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      shots: allShots,
      metadata: {
        shot_count: totalShots,
        segment_count: timelineChapter.script_segments.length,
        duration_ms: durationMs,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    logError("生成镜头失败", error, {
      chapterId,
      userId: payload.userId,
      durationMs,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { shot_status: "error" },
    });

    if (error instanceof NovelBackendError) {
      return NextResponse.json(
        {
          error: "镜头生成失败",
          detail: error.message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: "生成镜头失败",
        detail: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
