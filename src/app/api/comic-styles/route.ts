import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/comic-styles - 公开接口，获取启用的风格列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const enabledOnly = searchParams.get("enabled") !== "false"; // 默认只返回启用的

    const styles = await prisma.comicStyle.findMany({
      where: enabledOnly ? { enabled: true } : undefined,
      orderBy: [
        { sort_order: "asc" },
        { created_at: "asc" },
      ],
      select: {
        id: true,
        style_key: true,
        name_zh: true,
        name_en: true,
        image_url: true,
        tag_color: true,
        description: true,
        sort_order: true,
        enabled: true,
        usage_count: true,
      },
    });

    return NextResponse.json({
      data: styles,
      total: styles.length,
    });
  } catch (error) {
    console.error("[GET /api/comic-styles]", error);
    return NextResponse.json(
      { error: "获取风格列表失败" },
      { status: 500 }
    );
  }
}
