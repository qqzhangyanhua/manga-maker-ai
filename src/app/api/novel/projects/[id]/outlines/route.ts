/**
 * Novel Project Outlines API
 * GET /api/novel/projects/{id}/outlines - 获取故事大纲
 * PUT /api/novel/projects/{id}/outlines - 更新故事大纲
 *
 * 职责单一：仅处理 outlines 数据
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface OutlineItem {
  chapter_number: number;
  title: string;
  outline: string;
  word_count?: number;
  is_key_chapter?: boolean;
  status?: string;
}

interface OutlinesResponse {
  outlines: OutlineItem[];
  total_chapters: number;
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

    logInfo("Outlines request received", {
      endpoint: "/api/novel/projects/[id]/outlines",
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

    // 查询项目的 outlines 字段
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        user_id: true,
        outlines: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    const outlines = (project.outlines as OutlineItem[]) || [];

    const response: OutlinesResponse = {
      outlines,
      total_chapters: outlines.length,
      _links: {
        self: `/api/novel/projects/${projectId}/outlines`,
        project: `/api/novel/projects/${projectId}`,
      },
    };

    logInfo("Outlines fetched successfully", {
      endpoint: "/api/novel/projects/[id]/outlines",
      userId,
      projectId,
      totalChapters: outlines.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(response);
  } catch (error) {
    logError("Failed to fetch outlines", error, {
      endpoint: "/api/novel/projects/[id]/outlines",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "获取大纲失败";
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

    logInfo("Update outlines request", {
      endpoint: "/api/novel/projects/[id]/outlines",
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
    const { outlines } = body;

    if (!Array.isArray(outlines)) {
      return NextResponse.json({ error: "outlines 必须是数组" }, { status: 400 });
    }

    // 更新 outlines
    const updatedProject = await prisma.novelProject.update({
      where: { id: projectId },
      data: {
        outlines,
        chapter_count: outlines.length,
        updated_at: new Date(),
      },
      select: {
        outlines: true,
      },
    });

    logInfo("Outlines updated successfully", {
      endpoint: "/api/novel/projects/[id]/outlines",
      userId,
      projectId,
      totalChapters: outlines.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      outlines: updatedProject.outlines,
      total_chapters: outlines.length,
    });
  } catch (error) {
    logError("Failed to update outlines", error, {
      endpoint: "/api/novel/projects/[id]/outlines",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "更新大纲失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
