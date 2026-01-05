/**
 * Novel Project Detail API
 * GET /api/novel/projects/[id]
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
      endpoint: "/api/novel/projects/[id]",
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
    logInfo("User authenticated", {
      endpoint: "/api/novel/projects/[id]",
      userId,
      projectId,
    });

    // 查询项目
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        user_id: true,
        title: true,
        description: true,
        genre: true,
        world_setting: true,
        characters: true,
        outlines: true,
        target_words: true,
        status: true,
        cover_image: true,
        total_words: true,
        chapter_count: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证权限
    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    logInfo("Project fetched successfully", {
      endpoint: "/api/novel/projects/[id]",
      userId,
      projectId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(project);
  } catch (error) {
    logError("Failed to fetch project", error, {
      endpoint: "/api/novel/projects/[id]",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "获取项目失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("Request received", {
      endpoint: "/api/novel/projects/[id]",
      method: "PATCH",
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
    const { title, description, genre, status, target_words, characters, world_setting } = body;

    logInfo("Updating project", {
      endpoint: "/api/novel/projects/[id]",
      userId,
      projectId,
      updates: Object.keys(body),
    });

    // 更新项目
    const updatedProject = await prisma.novelProject.update({
      where: { id: projectId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(genre !== undefined && { genre }),
        ...(status !== undefined && { status }),
        ...(target_words !== undefined && { target_words }),
        ...(characters !== undefined && { characters }),
        ...(world_setting !== undefined && { world_setting }),
        updated_at: new Date(),
      },
    });

    logInfo("Project updated successfully", {
      endpoint: "/api/novel/projects/[id]",
      userId,
      projectId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    logError("Failed to update project", error, {
      endpoint: "/api/novel/projects/[id]",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "更新项目失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const projectId = params.id;

    logInfo("Request received", {
      endpoint: "/api/novel/projects/[id]",
      method: "DELETE",
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
      select: { user_id: true, title: true },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权删除此项目" }, { status: 403 });
    }

    logInfo("Deleting project", {
      endpoint: "/api/novel/projects/[id]",
      userId,
      projectId,
      projectTitle: project.title,
    });

    // 删除项目（关联的章节会通过 cascade 自动删除）
    await prisma.novelProject.delete({
      where: { id: projectId },
    });

    logInfo("Project deleted successfully", {
      endpoint: "/api/novel/projects/[id]",
      userId,
      projectId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("Failed to delete project", error, {
      endpoint: "/api/novel/projects/[id]",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "删除项目失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
