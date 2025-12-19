import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const handleError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "未知错误";
  const status = (error as Error & { status?: number })?.status ?? 500;
  return NextResponse.json({ success: false, message }, { status });
};

/**
 * 管理员查看所有用户的交易记录
 * 支持分页、按用户筛选、按操作类型筛选
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;

    const offset = (page - 1) * limit;

    // 构建查询条件
    const where: {
      user_id?: string;
      action?: string;
    } = {};

    if (userId) {
      where.user_id = userId;
    }

    if (action) {
      where.action = action;
    }

    // 查询交易记录和总数
    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.creditTransaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + transactions.length < total,
        },
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
