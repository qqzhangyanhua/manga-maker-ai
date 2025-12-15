import { NextRequest, NextResponse } from "next/server";
import { readAuthCookie, verifyAuthToken } from "@/lib/auth";
import { getCreditTransactions } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/profile/transactions
 * 获取用户算力交易记录
 */
export async function GET(request: NextRequest) {
  try {

    const token = readAuthCookie(request);
    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const action = searchParams.get("action") || undefined;

    // 获取交易记录
    const result = await getCreditTransactions(payload.userId, {
      limit: Math.min(limit, 100), // 最多返回100条
      offset: Math.max(offset, 0),
      action: action as Parameters<typeof getCreditTransactions>[1]["action"],
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("获取交易记录失败:", error);
    return NextResponse.json(
      { error: "获取交易记录失败" },
      { status: 500 }
    );
  }
}
