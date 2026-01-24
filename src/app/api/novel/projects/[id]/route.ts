/**
 * Novel Project Detail API (Refactored - RESTful Phase 3)
 * GET /api/novel/projects/[id]
 *
 * RESTful 设计原则：
 * - 职责单一：仅返回项目基础元数据
 * - HATEOAS：通过 _links 提供相关资源链接
 * - 向后兼容：支持 include_* 参数（兼容模式）
 *
 * Phase 3 变更：
 * - 默认不再返回 outlines, characters, world_setting
 * - 这些数据通过独立接口获取
 *
 * Query Parameters (向后兼容):
 * - include_chapters: boolean (default: false) - 是否包含章节列表
 * - include_content: boolean (default: false) - 章节是否包含 content
 * - include_outlines: boolean (default: false) - 是否包含大纲（兼容）
 * - include_characters: boolean (default: false) - 是否包含角色（兼容）
 * - include_world_setting: boolean (default: false) - 是否包含世界观（兼容）
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface ProjectResponse {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  genre: string | null;
  target_words: number | null;
  status: string;
  cover_image: string | null;
  total_words: number;
  chapter_count: number;
  created_at: Date;
  updated_at: Date;
  _links: {
    self: string;
    chapters: string;
    outlines: string;
    characters: string;
    world_setting: string;
    stats: string;
    verify_stats: string;
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

    logInfo("Request received", {
      endpoint: "/api/novel/projects/[id]",
      method: "GET",
      projectId,
    });

    // 解析查询参数（向后兼容）
    const searchParams = req.nextUrl.searchParams;
    const includeChapters = searchParams.get("include_chapters") === "true";
    const includeContent = searchParams.get("include_content") === "true";
    const includeOutlines = searchParams.get("include_outlines") === "true";
    const includeCharacters = searchParams.get("include_characters") === "true";
    const includeWorldSetting = searchParams.get("include_world_setting") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // 检测是否使用了任何兼容参数
    const useLegacyMode = includeChapters || includeContent || includeOutlines ||
                          includeCharacters || includeWorldSetting || searchParams.has("page");

    if (useLegacyMode) {
      logInfo("Legacy mode detected, using compatibility layer", {
        endpoint: "/api/novel/projects/[id]",
        includeChapters,
        includeOutlines,
        includeCharacters,
        includeWorldSetting,
        page,
        limit,
      });

      return handleLegacyRequest(req, projectId, {
        includeChapters,
        includeContent,
        includeOutlines,
        includeCharacters,
        includeWorldSetting,
        page,
        limit,
      });
    }

    // ✅ Phase 3 新版接口：仅返回基础元数据 + HATEOAS 链接
    logInfo("RESTful mode: returning metadata only (Phase 3)", {
      endpoint: "/api/novel/projects/[id]",
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

    // ✅ Phase 3: 仅查询基础元数据，不包含 outlines/characters/world_setting
    const project = await prisma.novelProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        user_id: true,
        title: true,
        description: true,
        genre: true,
        target_words: true,
        status: true,
        cover_image: true,
        total_words: true,
        chapter_count: true,
        created_at: true,
        updated_at: true,
        // ✅ Phase 3: 不再查询这些字段
        // outlines: false,
        // characters: false,
        // world_setting: false,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    // ✅ Phase 3: 扩展 HATEOAS 链接
    const response: ProjectResponse = {
      ...project,
      _links: {
        self: `/api/novel/projects/${projectId}`,
        chapters: `/api/novel/projects/${projectId}/chapters`,
        outlines: `/api/novel/projects/${projectId}/outlines`,
        characters: `/api/novel/projects/${projectId}/characters`,
        world_setting: `/api/novel/projects/${projectId}/world-setting`,
        stats: `/api/novel/projects/${projectId}/stats`,
        verify_stats: `/api/novel/projects/${projectId}/verify-stats`,
      },
    };

    logInfo("Project fetched successfully (RESTful mode Phase 3)", {
      endpoint: "/api/novel/projects/[id]",
      userId,
      projectId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(response);
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

/**
 * 向后兼容层：处理旧版 API 调用
 * 支持 include_outlines, include_characters, include_world_setting 参数
 */
async function handleLegacyRequest(
  req: NextRequest,
  projectId: string,
  options: {
    includeChapters: boolean;
    includeContent: boolean;
    includeOutlines: boolean;
    includeCharacters: boolean;
    includeWorldSetting: boolean;
    page: number;
    limit: number;
  }
) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const {
      includeChapters,
      includeContent,
      includeOutlines,
      includeCharacters,
      includeWorldSetting,
      page,
      limit
    } = options;

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
    const skip = (page - 1) * limit;

    // 构建动态查询选项
    const projectQuery = {
      where: { id: projectId },
      select: {
        id: true,
        user_id: true,
        title: true,
        description: true,
        genre: true,
        target_words: true,
        status: true,
        cover_image: true,
        total_words: true,
        chapter_count: true,
        created_at: true,
        updated_at: true,
        // 条件性包含各字段
        ...(includeOutlines && { outlines: true }),
        ...(includeCharacters && { characters: true }),
        ...(includeWorldSetting && { world_setting: true }),
        ...(includeChapters && {
          chapters: {
            select: {
              id: true,
              chapter_number: true,
              title: true,
              outline: true,
              ...(includeContent && { content: true }),
              word_count: true,
              status: true,
              is_key_chapter: true,
              created_at: true,
              updated_at: true,
            },
            orderBy: { chapter_number: 'asc' as const },
            skip,
            take: limit,
          },
        }),
      },
    };

    const project = await prisma.novelProject.findUnique(projectQuery);

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    // 构建响应
    let response: Record<string, unknown> = { ...project };

    if (includeChapters && project.chapters) {
      const totalChapters = project.chapter_count || 0;
      response = {
        ...project,
        pagination: {
          page,
          limit,
          total: totalChapters,
          total_pages: Math.ceil(totalChapters / limit),
          has_next: page * limit < totalChapters,
          has_prev: page > 1,
        },
      };
    }

    logInfo("Project fetched successfully (legacy mode)", {
      endpoint: "/api/novel/projects/[id]",
      userId,
      projectId,
      includeChapters,
      includeOutlines,
      includeCharacters,
      includeWorldSetting,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(response);
  } catch (error) {
    logError("Failed to fetch project (legacy mode)", error, {
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
    const { title, description, genre, status, target_words, characters, world_setting, outlines } = body;

    logInfo("Updating project", {
      endpoint: "/api/novel/projects/[id]",
      userId,
      projectId,
      updates: Object.keys(body),
    });

    // ✅ Phase 1: 不再需要手动更新统计字段
    // Prisma 中间件会自动维护 chapter_count 和 total_words

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
        ...(outlines !== undefined && { outlines }),
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
