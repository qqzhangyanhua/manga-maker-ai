import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/comic-styles/:id - 获取单个风格详情
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const style = await prisma.comicStyle.findUnique({
      where: { id },
    });

    if (!style) {
      return NextResponse.json(
        { error: "风格不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json(style);
  } catch (error) {
    console.error("[GET /api/comic-styles/:id]", error);
    return NextResponse.json(
      { error: "获取风格详情失败" },
      { status: 500 }
    );
  }
}
