import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { rechargeCredits } from "@/lib/credits";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const rechargeSchema = z.object({
  amount: z.number().int().positive("充值金额必须为正整数"),
  description: z.string().min(1).max(200).optional(),
});

const handleError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "未知错误";
  const status = (error as Error & { status?: number })?.status ?? 500;
  return NextResponse.json({ success: false, message }, { status });
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const userId = params.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "无效的用户 ID" },
        { status: 400 }
      );
    }

    // 验证用户存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, credits: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = rechargeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { amount, description } = parsed.data;

    // 调用充值函数
    await rechargeCredits({
      userId,
      amount,
      description: description || `管理员充值 ${amount} 算力`,
      refType: "admin_recharge",
      refId: null,
    });

    // 获取更新后的用户信息
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        credits: true,
        total_credits_used: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `成功为用户 ${user.email} 充值 ${amount} 算力`,
      data: { user: updatedUser },
    });
  } catch (error) {
    return handleError(error);
  }
}
