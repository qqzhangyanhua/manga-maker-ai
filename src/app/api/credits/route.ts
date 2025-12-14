import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { getUserCreditsInfo, getCreditTransactions } from "@/lib/credits";

export const runtime = "nodejs";

/**
 * GET /api/credits
 * 获取当前用户算力信息和交易记录
 * Query params:
 *   - limit: 交易记录数量（默认20）
 *   - offset: 偏移量（默认0）
 *   - action: 筛选交易类型
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const action = searchParams.get("action") as "register" | "consume" | "recharge" | "admin_adjust" | "refund" | undefined;

    // 获取算力信息
    const creditsInfo = await getUserCreditsInfo(payload.userId);

    // 获取交易记录
    const transactionsResult = await getCreditTransactions(payload.userId, {
      limit,
      offset,
      action: action ?? undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        credits: creditsInfo.credits,
        totalUsed: creditsInfo.totalUsed,
        transactions: transactionsResult.transactions,
        pagination: {
          total: transactionsResult.total,
          limit,
          offset,
          hasMore: transactionsResult.hasMore,
        },
      },
    });
  } catch (error) {
    console.error("获取算力信息失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取算力信息失败" },
      { status: 500 }
    );
  }
}
