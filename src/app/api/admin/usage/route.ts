import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/usage?userId=...&limit=50&days=7&from=ISO&to=ISO&action=image_generation&status=success
export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);
    const days = Math.min(Number(url.searchParams.get("days") || "7"), 30);
    const action = url.searchParams.get("action") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const now = new Date();
    const defaultSince = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const since = from ? new Date(from) : defaultSince;
    const until = to ? new Date(to) : now;


    const [usageStats, generationLogs] = await Promise.all([
      prisma.usageStat.findMany({
        where: {
          ...(userId ? { user_id: userId } : {}),
          ...(action ? { action } : {}),
          date: { gte: since, lte: until },
        },
        orderBy: [{ date: "desc" }, { user_id: "asc" }],
        take: 500,
      }),
      prisma.generationLog.findMany({
        where: {
          ...(userId ? { user_id: userId } : {}),
          ...(action ? { action } : {}),
          ...(status ? { status } : {}),
          created_at: { gte: since, lte: until },
        },
        orderBy: { created_at: "desc" },
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        usageStats,
        generationLogs,
        meta: { since, until, limit, userId: userId ?? null, action: action ?? null, status: status ?? null },
      },
    });
  } catch (error) {
    console.error("获取管理员用量失败:", error);
    const message = error instanceof Error ? error.message : "获取管理员用量失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
