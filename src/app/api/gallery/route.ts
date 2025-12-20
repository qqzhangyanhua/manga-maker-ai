import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { GalleryListResponse } from "@/lib/gallery-types";

// 强制动态渲染（使用 request.url）
export const dynamic = "force-dynamic";

/**
 * GET /api/gallery - 获取公开画廊列表
 * 公开接口，无需认证
 *
 * Query params:
 * - page: 页码 (default: 1)
 * - limit: 每页数量 (default: 20, max: 100)
 * - style_id: 风格筛选 (optional)
 * - sort: 排序方式 (latest|popular|views, default: latest)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    // 解析查询参数
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const styleId = searchParams.get("style_id") || undefined;
    const sort = searchParams.get("sort") || "latest";

    // 构建查询条件
    const where = {
      is_shared: true,
      generated_image: { not: null }, // 只显示有图片的作品
      project: styleId
        ? {
            // 根据 project 的 style 字段筛选
            // 注意：这里假设 style 字段存储的是 comic_style_id
            style: styleId,
          }
        : undefined,
    };

    // 构建排序条件
    let orderBy: Record<string, string> = {};
    switch (sort) {
      case "popular":
        // 综合热度：浏览量 + 分享时间
        orderBy = { view_count: "desc" };
        break;
      case "views":
        orderBy = { view_count: "desc" };
        break;
      case "latest":
      default:
        orderBy = { shared_at: "desc" };
        break;
    }

    // 查询总数
    const total = await prisma.panel.count({ where });

    // 查询分页数据
    const panels = await prisma.panel.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        project_id: true,
        panel_order: true,
        description: true,
        dialogue: true,
        generated_image: true,
        view_count: true,
        shared_at: true,
        show_prompt: true,

        // 关联项目信息
        project: {
          select: {
            id: true,
            title: true,
            style: true,
            user_id: true,
          },
        },
      },
    });

    // 获取用户信息（批量查询优化）
    const userIds = [...new Set(panels.map((p) => p.project.user_id))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        image: true,
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // 获取风格信息（如果有）
    const styleIds = [
      ...new Set(panels.map((p) => p.project.style).filter((s): s is string => s !== null)),
    ];
    const styles = await prisma.comicStyle.findMany({
      where: { id: { in: styleIds } },
      select: {
        id: true,
        name_zh: true,
        name_en: true,
        style_key: true,
      },
    });
    const styleMap = new Map(styles.map((s) => [s.id, s]));

    // 组装响应数据
    const items = panels.map((panel) => {
      const user = userMap.get(panel.project.user_id);
      const style = panel.project.style ? styleMap.get(panel.project.style) : null;

      return {
        id: panel.id,
        project_id: panel.project_id,
        panel_order: panel.panel_order,
        description: panel.description,
        dialogue: panel.dialogue,
        generated_image: panel.generated_image,
        view_count: panel.view_count,
        shared_at: panel.shared_at,
        show_prompt: panel.show_prompt,
        project: {
          id: panel.project.id,
          title: panel.project.title,
          style: panel.project.style,
          user_id: panel.project.user_id,
        },
        author: {
          id: user?.id || panel.project.user_id,
          name: user?.name || null,
          image: user?.image || null,
        },
        comic_style: style || null,
      };
    });

    const response: GalleryListResponse = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Gallery list error:", error);
    return NextResponse.json({ error: "获取画廊列表失败" }, { status: 500 });
  }
}
