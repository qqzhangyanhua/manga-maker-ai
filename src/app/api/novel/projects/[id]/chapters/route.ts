/**
 * Novel Project Chapters List API
 * GET /api/novel/projects/{id}/chapters
 *
 * RESTful 设计原则：
 * - 职责单一：仅返回章节列表（不包含 content）
 * - 默认分页：limit=50, page=1
 * - 性能优化：仅查询必要字段
 *
 * Query Parameters:
 * - page: number (default: 1) - 页码
 * - limit: number (default: 50, max: 100) - 每页数量
 * - sort: string (default: 'asc') - 排序方向 (asc/desc)
 *
 * Linus 视角：
 * "一个接口只做一件事：返回章节列表。不返回内容，不返回统计，这才是好品味。"
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

interface ChapterListItem {
  id: string;
  chapter_number: number;
  title: string;
  outline: string | null;
  word_count: number;
  status: string;
  is_key_chapter: boolean;
  created_at: Date;
  updated_at: Date;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface ChaptersListResponse {
  items: ChapterListItem[];
  pagination: PaginationMeta;
  _links: {
    self: string;
    project: string;
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
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

    logInfo("Chapters list request", {
      endpoint: "/api/novel/projects/[id]/chapters",
      method: "GET",
      projectId,
    });

    // 解析查询参数
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const sortOrder = searchParams.get("sort") === "desc" ? "desc" : "asc";

    logInfo("Query parameters parsed", {
      endpoint: "/api/novel/projects/[id]/chapters",
      page,
      limit,
      sortOrder,
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
      select: {
        id: true,
        user_id: true,
        chapter_count: true, // 使用缓存的章节数
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此项目" }, { status: 403 });
    }

    // 计算分页偏移量
    const skip = (page - 1) * limit;

    // 查询章节列表（不包含 content 字段）
    const chapters = await prisma.novelChapter.findMany({
      where: { project_id: projectId },
      select: {
        id: true,
        chapter_number: true,
        title: true,
        outline: true,
        word_count: true,
        status: true,
        is_key_chapter: true,
        created_at: true,
        updated_at: true,
        // ✅ 不查询 content 字段，减少数据传输
      },
      orderBy: {
        chapter_number: sortOrder,
      },
      skip,
      take: limit,
    });

    // 使用缓存的 chapter_count（避免额外 COUNT 查询）
    const totalChapters = project.chapter_count || 0;
    const totalPages = Math.ceil(totalChapters / limit);

    // 构建 HATEOAS 链接
    const baseUrl = `/api/novel/projects/${projectId}/chapters`;
    const links: ChaptersListResponse["_links"] = {
      self: `${baseUrl}?page=${page}&limit=${limit}`,
      project: `/api/novel/projects/${projectId}`,
    };

    if (page > 1) {
      links.first = `${baseUrl}?page=1&limit=${limit}`;
      links.prev = `${baseUrl}?page=${page - 1}&limit=${limit}`;
    }

    if (page < totalPages) {
      links.next = `${baseUrl}?page=${page + 1}&limit=${limit}`;
      links.last = `${baseUrl}?page=${totalPages}&limit=${limit}`;
    }

    // 构建响应
    const response: ChaptersListResponse = {
      items: chapters as ChapterListItem[],
      pagination: {
        page,
        limit,
        total: totalChapters,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
      _links: links,
    };

    logInfo("Chapters list fetched successfully", {
      endpoint: "/api/novel/projects/[id]/chapters",
      userId,
      projectId,
      chaptersCount: chapters.length,
      page,
      totalPages,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(response);
  } catch (error) {
    logError("Failed to fetch chapters list", error, {
      endpoint: "/api/novel/projects/[id]/chapters",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    const message = error instanceof Error ? error.message : "获取章节列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
