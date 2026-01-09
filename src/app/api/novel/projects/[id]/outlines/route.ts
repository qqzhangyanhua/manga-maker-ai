/**
 * Novel Project Outlines API
 * GET /api/novel/projects/[id]/outlines - 获取大纲列表
 * PUT /api/novel/projects/[id]/outlines - 更新大纲列表
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("Request received", {
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

    // 查询项目大纲
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

    // 验证权限
    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    logInfo("Outlines fetched successfully", {
      endpoint: "/api/novel/projects/[id]/outlines",
      userId,
      projectId,
      outlinesCount: Array.isArray(project.outlines) ? project.outlines.length : 0,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      outlines: project.outlines || [],
    });
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

    logInfo("Request received", {
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
      select: { user_id: true, chapter_count: true },
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

    // 验证大纲格式
    for (const outline of outlines) {
      if (!outline.chapter_number || typeof outline.chapter_number !== "number") {
        return NextResponse.json(
          { error: "每个大纲必须包含有效的 chapter_number" },
          { status: 400 }
        );
      }
      if (!outline.title || typeof outline.title !== "string") {
        return NextResponse.json(
          { error: "每个大纲必须包含有效的 title" },
          { status: 400 }
        );
      }
    }

    logInfo("Updating outlines", {
      endpoint: "/api/novel/projects/[id]/outlines",
      userId,
      projectId,
      outlinesCount: outlines.length,
    });

    // 更新大纲和章节计数
    const updatedProject = await prisma.novelProject.update({
      where: { id: projectId },
      data: {
        outlines,
        chapter_count: outlines.length,
        updated_at: new Date(),
      },
      select: {
        id: true,
        outlines: true,
        chapter_count: true,
        updated_at: true,
      },
    });

    logInfo("Outlines updated successfully", {
      endpoint: "/api/novel/projects/[id]/outlines",
      userId,
      projectId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(updatedProject);
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
