import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/llm-providers/types
 * Get all unique provider types from enabled providers
 */
export async function GET() {
  try {
    const providers = await prisma.llmProvider.findMany({
      where: { enabled: true },
      select: {
        provider_type: true,
      },
      distinct: ["provider_type"],
      orderBy: { provider_type: "asc" },
    });

    const types = providers.map((p) => p.provider_type);

    return NextResponse.json({
      success: true,
      types,
    });
  } catch (error) {
    console.error("Get provider types error:", error);
    return NextResponse.json(
      { error: "获取模型类型失败" },
      { status: 500 }
    );
  }
}
