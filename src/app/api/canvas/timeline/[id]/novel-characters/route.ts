/**
 * Canvas Timeline Novel Characters API
 * GET /api/canvas/timeline/[id]/novel-characters - 获取时间线关联小说的角色列表
 *
 * 从 NovelProject.characters (JSONB) 中解析角色信息，用于漫画生成时的角色选择
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface NovelCharacter {
  name: string;
  role: string;
  description: string;
  traits?: string[];
  relationships?: Record<string, string>;
  tempId: string;
  generatedImageUrl?: string;
}

export async function GET(req: Request, { params }: RouteParams) {
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

  const { id: timelineId } = await params;

  try {
    logInfo("获取时间线小说角色", {
      endpoint: "/api/canvas/timeline/[id]/novel-characters",
      timelineId,
      userId: payload.userId,
    });

    const timeline = await prisma.canvasTimeline.findFirst({
      where: {
        id: timelineId,
        user_id: payload.userId,
      },
      select: {
        id: true,
        title: true,
        novel_project_id: true,
        project_id: true,
      },
    });

    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }

    // 时间线已归属漫画项目：角色来源是项目角色（角色库实体，可直接绑定镜头）
    if (timeline.project_id) {
      const projectCharacters = await prisma.projectCharacter.findMany({
        where: { project_id: timeline.project_id },
        include: { character: true },
        orderBy: { display_order: "asc" },
      });

      const characters: NovelCharacter[] = projectCharacters.map((pc) => ({
        name: pc.character.name,
        role: pc.role,
        description: pc.character.description || "",
        tempId: pc.character.id,
        generatedImageUrl:
          pc.character.base_image_url || pc.character.reference_image || undefined,
      }));

      logInfo("时间线项目角色获取成功", {
        timelineId,
        projectId: timeline.project_id,
        characterCount: characters.length,
        durationMs: Date.now() - startedAt,
      });

      return NextResponse.json({
        success: true,
        source: "project",
        timeline_id: timeline.id,
        timeline_title: timeline.title,
        project_id: timeline.project_id,
        characters,
      });
    }

    const novel = await prisma.novelProject.findUnique({
      where: { id: timeline.novel_project_id },
      select: {
        id: true,
        title: true,
        characters: true,
      },
    });

    if (!novel) {
      return NextResponse.json({ error: "关联小说项目不存在" }, { status: 404 });
    }

    let characters: NovelCharacter[] = [];

    if (novel.characters && typeof novel.characters === "object") {
      const rawCharacters = Array.isArray(novel.characters)
        ? novel.characters
        : [];

      characters = rawCharacters.map((char: unknown, index: number) => {
        const c = char as Record<string, unknown>;
        return {
          name: typeof c.name === "string" ? c.name : `角色${index + 1}`,
          role: typeof c.role === "string" ? c.role : "supporting",
          description: typeof c.description === "string" ? c.description : "",
          traits: Array.isArray(c.traits) ? (c.traits as string[]) : undefined,
          relationships:
            typeof c.relationships === "object" && c.relationships !== null
              ? (c.relationships as Record<string, string>)
              : undefined,
          tempId: `novel-char-${index}`,
          generatedImageUrl:
            typeof c.generatedImageUrl === "string"
              ? c.generatedImageUrl
              : undefined,
        };
      });
    }

    logInfo("时间线小说角色获取成功", {
      timelineId,
      novelId: novel.id,
      characterCount: characters.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      source: "novel",
      timeline_id: timeline.id,
      timeline_title: timeline.title,
      novel_id: novel.id,
      novel_title: novel.title,
      characters,
    });
  } catch (error) {
    logError("获取时间线小说角色失败", error, {
      endpoint: "/api/canvas/timeline/[id]/novel-characters",
      timelineId,
      userId: payload.userId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: "获取角色列表失败" },
      { status: 500 }
    );
  }
}
