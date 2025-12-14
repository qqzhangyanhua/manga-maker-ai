import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { UserSharedItem } from "@/lib/gallery-types";

/**
 * GET /api/profile/shared - 获取当前用户的分享列表
 * 需要认证
 *
 * Query params:
 * - page: 页码 (default: 1)
 * - limit: 每页数量 (default: 20, max: 100)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
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

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    // 构建查询条件：当前用户的已分享作品
    const where = {
      is_shared: true,
      project: {
        user_id: payload.userId,
      },
    };

    // 查询总数
    const total = await prisma.panel.count({ where });

    // 查询分页数据
    const panels = await prisma.panel.findMany({
      where,
      orderBy: { shared_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        generated_image: true,
        description: true,
        view_count: true,
        shared_at: true,
        show_prompt: true,
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // 组装响应数据
    const items: UserSharedItem[] = panels.map((panel) => ({
      id: panel.id,
      generated_image: panel.generated_image,
      description: panel.description,
      view_count: panel.view_count,
      shared_at: panel.shared_at,
      show_prompt: panel.show_prompt,
      project: {
        id: panel.project.id,
        title: panel.project.title,
      },
    }));

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get user shared list error:", error);
    return NextResponse.json({ error: "获取分享列表失败" }, { status: 500 });
  }
}
