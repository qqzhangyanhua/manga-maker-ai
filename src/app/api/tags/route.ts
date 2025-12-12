/**
 * Tag API Routes
 *
 * GET  /api/tags - Get tag list
 * POST /api/tags - Create tag
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/tags
 *
 * Get tag list with filtering
 *
 * Query params:
 * - type: "system" | "user" (optional)
 * - category: string (optional)
 * - search: string (optional)
 * - limit: number (default: 100)
 */
export async function GET(req: NextRequest) {
  try {
    // Optional authentication for user-specific tags
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    let userId: string | null = null;

    if (token) {
      const payload = verifyAuthToken(token);
      userId = payload?.userId || null;
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type") as "system" | "user" | null;
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // If requesting user tags, filter by created_by
    if (type === "user" && userId) {
      where.created_by = userId;
    }

    // Query tags
    const tags = await prisma.tag.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        created_by: true,
        usage_count: true,
        created_at: true
      },
      orderBy: [
        { usage_count: "desc" },
        { created_at: "desc" }
      ],
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: { tags, count: tags.length }
    });
  } catch (error) {
    console.error("GET /api/tags error:", error);
    return NextResponse.json(
      { success: false, error: "获取标签列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tags
 *
 * Create a new tag
 *
 * Body:
 * - name: string (required, 1-50 chars)
 * - category: string (optional)
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
    const { name, category } = body;

    // Validate input
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "标签名称不能为空" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      return NextResponse.json(
        { success: false, error: "标签名称长度为1-50个字符" },
        { status: 400 }
      );
    }

    // Check if tag already exists (case-insensitive)
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: "insensitive"
        }
      }
    });

    if (existingTag) {
      return NextResponse.json(
        { success: false, error: "标签已存在" },
        { status: 409 }
      );
    }

    // Create tag
    const tag = await prisma.tag.create({
      data: {
        name: trimmedName,
        type: "user",
        category: category?.trim() || null,
        created_by: payload.userId,
        usage_count: 0
      },
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        created_by: true,
        usage_count: true,
        created_at: true
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: { tag },
        message: "标签创建成功"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/tags error:", error);
    return NextResponse.json(
      { success: false, error: "创建标签失败" },
      { status: 500 }
    );
  }
}
