import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/scenes
 * 获取场景列表（分页 + 过滤）
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { searchParams } = new URL(request.url);

    // 分页参数
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 200);
    const offset = (page - 1) * limit;

    // 过滤参数
    const keyword = searchParams.get("keyword")?.trim();
    const userId = searchParams.get("userId")?.trim();
    const sceneType = searchParams.get("sceneType")?.trim();

    // 构建查询条件
    const where: Prisma.SceneWhereInput = {};

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }

    if (userId) {
      where.user_id = userId;
    }

    if (sceneType && sceneType !== "all") {
      where.scene_type = sceneType;
    }

    // 执行查询
    const [total, scenes] = await prisma.$transaction([
      prisma.scene.count({ where }),
      prisma.scene.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
    ]);

    // 获取用户信息
    const userIds = [...new Set(scenes.map((s) => s.user_id))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });

    const userMap: Record<string, { id: string; email: string; name: string | null }> = {};
    users.forEach((user) => {
      userMap[user.id] = user;
    });

    // 获取所有用户（用于过滤下拉框）
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
      orderBy: { email: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        items: scenes,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        userMap,
        allUsers,
      },
    });
  } catch (error) {
    console.error("获取场景列表失败:", error);
    const message = error instanceof Error ? error.message : "获取场景列表失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
