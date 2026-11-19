/**
 * 从一章小说生成分镜
 * POST /api/canvas/chapter/[id]/generate-shots
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNovelBackendClient, NovelBackendError } from "@/lib/novel-backend-client";
import { logInfo, logError } from "@/lib/api-logger";
import { ApiError } from "@/lib/api-helpers";
import {
  birthChapterPanels,
  getAnchoredCanvasChapter,
  NoPanelsWrittenError,
  projectCharacterIdsOf,
  refreshCanvasCounters,
} from "@/lib/canvas";
import type { AnchoredCanvasChapter } from "@/lib/canvas";
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

  let anchored: AnchoredCanvasChapter;
  try {
    anchored = await getAnchoredCanvasChapter(prisma, chapterId, payload.userId);
  } catch (error) {
    return canvasErrorResponse(error, "生成分镜失败");
  }

  try {
    logInfo("开始生成分镜", {
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
      return NextResponse.json({ error: "请先生成剧本" }, { status: 400 });
    }

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { shot_status: "generating" },
    });

    const client = getNovelBackendClient();
    const born = await birthChapterPanels(prisma, {
      chapter: anchored,
      userId: payload.userId,
      segments: timelineChapter.script_segments.map((segment) => ({
        id: segment.id,
        content: segment.content,
        scene_description: segment.scene_description,
        character_actions: segment.character_actions,
      })),
      plan: async (request) => {
        const planned = await client.planShots(request);
        if (!planned.success) {
          throw new NovelBackendError("镜头规划失败", "规划没有成功");
        }
        return planned.shots;
      },
    });

    const projectCharacterIds = projectCharacterIdsOf(born.panels);
    const linkedCharacters = projectCharacterIds.length
      ? await prisma.projectCharacter.findMany({
          where: { id: { in: projectCharacterIds } },
          select: { character_id: true },
        })
      : [];

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        shot_status: "completed",
        character_ids: Array.from(new Set(linkedCharacters.map((row) => row.character_id))),
      },
    });
    await refreshCanvasCounters(prisma, chapterId);

    const durationMs = Date.now() - startedAt;
    logInfo("分镜生成成功", {
      chapterId,
      userId: payload.userId,
      shotCount: born.panels.length,
      skippedCount: born.skipped.length,
      durationMs,
    });

    return NextResponse.json({
      success: true,
      shots: born.panels,
      skipped: born.skipped,
      metadata: {
        shot_count: born.panels.length,
        segment_count: timelineChapter.script_segments.length,
        skipped_count: born.skipped.length,
        duration_ms: durationMs,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logError("生成分镜失败", error, {
      chapterId,
      userId: payload.userId,
      durationMs,
    });

    await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: { shot_status: "error" },
    });

    if (error instanceof NoPanelsWrittenError) {
      return NextResponse.json(
        { error: error.message, code: error.code, skipped: error.skipped },
        { status: error.statusCode }
      );
    }

    if (error instanceof NovelBackendError) {
      return NextResponse.json(
        { error: "分镜生成失败", detail: error.message },
        { status: 502 }
      );
    }

    if (error instanceof ApiError) {
      return canvasErrorResponse(error, "生成分镜失败");
    }

    return NextResponse.json(
      { error: "生成分镜失败", detail: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}
