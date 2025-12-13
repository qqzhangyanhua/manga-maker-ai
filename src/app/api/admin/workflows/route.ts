import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/workflows
 * 获取工作流列表（分页 + 过滤）
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
    const userId = searchParams.get("userId")?.trim();
    const type = searchParams.get("type")?.trim();
    const status = searchParams.get("status")?.trim();

    // 构建查询条件
    const where: Prisma.WorkflowWhereInput = {};

    if (userId) {
      where.user_id = userId;
    }

    if (type && type !== "all") {
      where.type = type;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    // 执行查询
    const [total, workflows] = await prisma.$transaction([
      prisma.workflow.count({ where }),
      prisma.workflow.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
    ]);

    // 获取用户信息
    const userIds = [...new Set(workflows.map((w) => w.user_id))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });

    const userMap: Record<string, { id: string; email: string; name: string | null }> = {};
    users.forEach((user) => {
      userMap[user.id] = user;
    });

    // 获取所有用户
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
      orderBy: { email: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        items: workflows,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        userMap,
        allUsers,
      },
    });
  } catch (error) {
    console.error("获取工作流列表失败:", error);
    const message = error instanceof Error ? error.message : "获取工作流列表失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
