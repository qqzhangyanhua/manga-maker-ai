import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/generation-logs
 * 获取生成日志列表（分页 + 过滤）
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
    const action = searchParams.get("action")?.trim();
    const status = searchParams.get("status")?.trim();
    const providerType = searchParams.get("providerType")?.trim();
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();

    // 构建查询条件
    const where: Prisma.GenerationLogWhereInput = {};

    if (userId) {
      where.user_id = userId;
    }

    if (action && action !== "all") {
      where.action = action;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (providerType && providerType !== "all") {
      where.provider_type = providerType;
    }

    if (startDate) {
      where.created_at = {
        ...((where.created_at as Prisma.DateTimeFilter) || {}),
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.created_at = {
        ...((where.created_at as Prisma.DateTimeFilter) || {}),
        lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    // 执行查询
    const [total, logs] = await prisma.$transaction([
      prisma.generationLog.count({ where }),
      prisma.generationLog.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: offset,
        take: limit,
      }),
    ]);

    // 获取用户信息
    const userIds = [...new Set(logs.map((log) => log.user_id))];
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
        items: logs,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        userMap,
        allUsers,
      },
    });
  } catch (error) {
    console.error("获取生成日志失败:", error);
    const message = error instanceof Error ? error.message : "获取生成日志失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
