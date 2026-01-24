/**
 * Novel Project Characters API
 * GET /api/novel/projects/{id}/characters - 获取角色列表
 * PUT /api/novel/projects/{id}/characters - 更新角色列表
 *
 * 职责单一：仅处理 characters 数据
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface CharacterItem {
  id?: string;
  name: string;
  role?: string;
  description?: string;
  personality?: string;
  background?: string;
  appearance?: string;
  relationships?: Array<{
    targetId: string;
    type: string;
    description?: string;
  }>;
}

interface CharactersResponse {
  characters: CharacterItem[];
  total_characters: number;
  _links: {
    self: string;
    project: string;
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("Characters request received", {
      endpoint: "/api/novel/projects/[id]/characters",
      method: "GET",
      projectId,
    });

    // 验证认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    userId = payload.userId;

    // 查询项目的 characters 字段
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        user_id: true,
        characters: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    const characters = (project.characters as CharacterItem[]) || [];

    const response: CharactersResponse = {
      characters,
      total_characters: characters.length,
      _links: {
        self: `/api/novel/projects/${projectId}/characters`,
        project: `/api/novel/projects/${projectId}`,
      },
    };

    logInfo("Characters fetched successfully", {
      endpoint: "/api/novel/projects/[id]/characters",
      userId,
      projectId,
      totalCharacters: characters.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(response);
  } catch (error) {
    logError("Failed to fetch characters", error, {
      endpoint: "/api/novel/projects/[id]/characters",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "获取角色失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("Update characters request", {
      endpoint: "/api/novel/projects/[id]/characters",
      method: "PUT",
      projectId,
    });

    // 验证认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    userId = payload.userId;

    // 验证项目归属
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: { user_id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权修改此项目" }, { status: 403 });
    }

    // 解析请求体
    const body = await req.json();
    const { characters } = body;

    if (!Array.isArray(characters)) {
      return NextResponse.json({ error: "characters 必须是数组" }, { status: 400 });
    }

    // 更新 characters
    const updatedProject = await prisma.novelProject.update({
      where: { id: projectId },
      data: {
        characters,
        updated_at: new Date(),
      },
      select: {
        characters: true,
      },
    });

    logInfo("Characters updated successfully", {
      endpoint: "/api/novel/projects/[id]/characters",
      userId,
      projectId,
      totalCharacters: characters.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      characters: updatedProject.characters,
      total_characters: characters.length,
    });
  } catch (error) {
    logError("Failed to update characters", error, {
      endpoint: "/api/novel/projects/[id]/characters",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "更新角色失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
