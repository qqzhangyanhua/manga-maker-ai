/**
 * Tag Detail API
 *
 * GET    /api/tags/[id] - Get tag details
 * DELETE /api/tags/[id] - Delete tag
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/tags/[id]
 *
 * Get tag details including usage statistics
 */
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    const tag = await prisma.tag.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        created_by: true,
        usage_count: true,
        created_at: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, error: "标签不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { tag }
    });
  } catch (error) {
    console.error("GET /api/tags/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "获取标签详情失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tags/[id]
 *
 * Delete a user-created tag
 * System tags cannot be deleted
 */
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

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

    // Get tag
    const tag = await prisma.tag.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        created_by: true
      }
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, error: "标签不存在" },
        { status: 404 }
      );
    }

    // Check permissions
    if (tag.type === "system") {
      return NextResponse.json(
        { success: false, error: "系统标签不能删除" },
        { status: 403 }
      );
    }

    if (tag.created_by !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "只能删除自己创建的标签" },
        { status: 403 }
      );
    }

    // Delete tag (cascade delete taggings)
    await prisma.tag.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "标签删除成功"
    });
  } catch (error) {
    console.error("DELETE /api/tags/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "删除标签失败" },
      { status: 500 }
    );
  }
}
