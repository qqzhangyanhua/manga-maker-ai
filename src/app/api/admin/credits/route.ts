import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { adminAdjustCredits } from "@/lib/credits";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const adjustSchema = z.object({
  userId: z.string().uuid("用户ID格式不正确"),
  amount: z.number().int("金额必须是整数").refine((v) => v !== 0, "金额不能为0"),
  description: z.string().min(1, "请填写调整原因").max(200, "原因过长"),
});

/**
 * GET /api/admin/credits
 * 获取所有用户的算力信息
 * Query params:
 *   - page: 页码（默认1）
 *   - pageSize: 每页数量（默认20）
 *   - search: 搜索邮箱或名称
 */
export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
    const search = searchParams.get("search") ?? "";

    const skip = (page - 1) * pageSize;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          credits: true,
          total_credits_used: true,
          role: true,
          status: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error("获取用户算力列表失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/credits
 * 管理员调整用户算力
 * Body: { userId, amount, description }
 */
export async function POST(request: NextRequest) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  try {
    const body = await request.json();
    const parsed = adjustSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userId, amount, description } = parsed.data;

    const result = await adminAdjustCredits({
      userId,
      amount,
      description,
      adminId: adminResult.userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        newBalance: result.newBalance,
        amount,
      },
      message: amount > 0 ? `已增加 ${amount} 算力` : `已扣除 ${Math.abs(amount)} 算力`,
    });
  } catch (error) {
    console.error("调整用户算力失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "调整失败" },
      { status: 500 }
    );
  }
}
