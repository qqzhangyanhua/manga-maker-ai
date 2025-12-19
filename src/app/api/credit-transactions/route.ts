import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { getCreditTransactions } from "@/lib/credits";

export const runtime = "nodejs";

const handleError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "未知错误";
  const status = (error as Error & { status?: number })?.status ?? 500;
  return NextResponse.json({ success: false, message }, { status });
};

/**
 * 用户查看自己的交易记录
 * 支持分页、按操作类型筛选
 */
export async function GET(request: NextRequest) {
  try {
    // 身份验证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, message: "无效的token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const action = searchParams.get("action") || undefined;

    const offset = (page - 1) * limit;

    // 调用 credits.ts 中的函数获取交易记录
    const result = await getCreditTransactions(payload.userId, {
      limit,
      offset,
      action: action as "register" | "consume" | "recharge" | "admin_adjust" | "refund" | undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions: result.transactions,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasMore: result.hasMore,
        },
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
