/**
 * Template API Routes
 *
 * GET  /api/templates - Get template list
 * POST /api/templates - Create template
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureOfficialTemplatesSeed } from "@/lib/templates";
import type { PanelTemplate, SuccessResponse } from "@/types/template";

/**
 * GET /api/templates
 *
 * Get panel template list with filtering and pagination
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - tags: string (comma-separated)
 * - type: "my" | "official" | "community"
 * - panelCount: "1-3" | "4-6" | "7-12"
 * - search: string
 */
export async function GET(req: NextRequest) {
  try {
    // 如果缺少官方模板，自动注入预置模板（幂等）
    await ensureOfficialTemplatesSeed();

    // Optional authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    let userId: string | null = null;

    if (token) {
      const payload = verifyAuthToken(token);
      userId = payload?.userId || null;
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
    const type = searchParams.get("type") as "my" | "official" | "community" | null;
    const panelCountRange = searchParams.get("panelCount");
    const search = searchParams.get("search")?.trim();

    // Build where clause
    const where: any = {};

    // Filter by type
    if (type === "my") {
      if (!userId) {
        return NextResponse.json(
          { success: false, error: "需要登录" },
          { status: 401 }
        );
      }
      where.user_id = userId;
    } else if (type === "official") {
      where.is_official = true;
    } else if (type === "community") {
      where.is_public = true;
      where.is_official = false;
    } else {
      // Default: public templates + my templates (if logged in)
      where.OR = [
        { is_public: true },
        ...(userId ? [{ user_id: userId }] : [])
      ];
    }

    // Filter by tags
    if (tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // Filter by panel count range
    if (panelCountRange) {
      const [min, max] = panelCountRange.split("-").map(n => parseInt(n, 10));
      if (!isNaN(min) && !isNaN(max)) {
        where.panel_count = { gte: min, lte: max };
      }
    }

    // Search in name and description
    if (search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } }
          ]
        }
      ];
    }

    // Count total results
    const total = await prisma.panelTemplate.count({ where });

    // Query templates with pagination
    const templates = await prisma.panelTemplate.findMany({
      where,
      select: {
        id: true,
        user_id: true,
        name: true,
        description: true,
        panel_count: true,
        template_data: true,
        tags: true,
        is_public: true,
        is_official: true,
        likes_count: true,
        usage_count: true,
        thumbnail_url: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get user's liked template IDs (if logged in)
    let likedTemplateIds: string[] = [];
    if (userId) {
      const likes = await prisma.templateLike.findMany({
        where: { user_id: userId },
        select: { template_id: true }
      });
      likedTemplateIds = likes.map(like => like.template_id);
    }

    const response: SuccessResponse<{
      templates: typeof templates;
      likedTemplateIds: string[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }> = {
      success: true,
      data: {
        templates,
        likedTemplateIds,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/templates error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取模板列表失败"
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 *
 * Create a new panel template from existing panels
 *
 * Body:
 * - name: string (required)
 * - description: string (optional)
 * - panelIds: string[] (required, 2-12 panels)
 * - tags: string[] (optional)
 * - isPublic: boolean (optional, default: false)
 */
export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: "无效的token" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { name, description, panelIds, tags, isPublic } = body;

    // Validate input
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "模板名称至少2个字符" },
        { status: 400 }
      );
    }

    if (!panelIds || !Array.isArray(panelIds) || panelIds.length < 2 || panelIds.length > 12) {
      return NextResponse.json(
        { success: false, error: "请选择2-12个分镜" },
        { status: 400 }
      );
    }

    // Fetch panels data
    const panels = await prisma.panel.findMany({
      where: {
        id: { in: panelIds },
        project: { user_id: payload.userId } // Ensure user owns these panels
      },
      select: {
        id: true,
        panel_order: true,
        panel_type: true,
        camera_angle: true,
        shot_size: true,
        importance: true
      },
      orderBy: { panel_order: "asc" }
    });

    if (panels.length !== panelIds.length) {
      return NextResponse.json(
        { success: false, error: "部分分镜不存在或无权限" },
        { status: 403 }
      );
    }

    // Build template data
    const templateData = {
      panels: panels.map((panel, index) => ({
        panel_type: panel.panel_type,
        camera_angle: panel.camera_angle,
        shot_size: panel.shot_size,
        importance: panel.importance,
        relative_position: index
      }))
    };

    // Create template
    const template = await prisma.panelTemplate.create({
      data: {
        user_id: payload.userId,
        name: name.trim(),
        description: description?.trim() || null,
        panel_count: panels.length,
        template_data: templateData,
        tags: tags && Array.isArray(tags) ? tags.filter(Boolean) : [],
        is_public: isPublic === true,
        is_official: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    const response: SuccessResponse<{ template: typeof template }> = {
      success: true,
      data: { template },
      message: "模板创建成功"
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/templates error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "创建模板失败"
      },
      { status: 500 }
    );
  }
}
