/**
 * Novel Projects List API
 * GET /api/novel/projects - 获取项目列表
 * POST /api/novel/projects - 创建新项目
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    logInfo("Request received", {
      endpoint: "/api/novel/projects",
      method: "GET",
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
      endpoint: "/api/novel/projects",
      userId,
    });

    // 查询用户的所有项目
    const projects = await prisma.novelProject.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        title: true,
        description: true,
        genre: true,
        status: true,
        cover_image: true,
        total_words: true,
        chapter_count: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { updated_at: "desc" },
    });

    logInfo("Projects fetched successfully", {
      endpoint: "/api/novel/projects",
      userId,
      count: projects.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(projects);
  } catch (error) {
    logError("Failed to fetch projects", error, {
      endpoint: "/api/novel/projects",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "获取项目列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    logInfo("Request received", {
      endpoint: "/api/novel/projects",
      method: "POST",
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

    // 解析请求体
    const body = await req.json();
    const { title, description, genre, target_words } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "项目标题不能为空" }, { status: 400 });
    }

    logInfo("Creating project", {
      endpoint: "/api/novel/projects",
      userId,
      title,
      genre,
    });

    // 创建项目
    const project = await prisma.novelProject.create({
      data: {
        user_id: userId,
        title: title.trim(),
        description: description || null,
        genre: genre || null,
        target_words: target_words || null,
        status: "draft",
        total_words: 0,
        chapter_count: 0,
      },
    });

    logInfo("Project created successfully", {
      endpoint: "/api/novel/projects",
      userId,
      projectId: project.id,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    logError("Failed to create project", error, {
      endpoint: "/api/novel/projects",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "创建项目失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
