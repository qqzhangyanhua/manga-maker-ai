import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createGenreSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, "code 只能包含小写字母、数字和下划线"),
  display_name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/admin/genres
 * 获取专题列表
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const genres = await prisma.genre.findMany({
      where: includeInactive ? {} : { is_active: true },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: genres,
    });
  } catch (error) {
    console.error("获取专题列表失败:", error);
    const message = error instanceof Error ? error.message : "获取专题列表失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * POST /api/admin/genres
 * 创建专题
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const body = await request.json();
    const validation = createGenreSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "参数验证失败",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { code, display_name, description, sort_order, is_active } = validation.data;

    // 检查 code 是否已存在
    const existing = await prisma.genre.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "专题代码已存在" },
        { status: 400 }
      );
    }

    // 创建专题
    const genre = await prisma.genre.create({
      data: {
        code,
        display_name,
        description: description || null,
        sort_order: sort_order ?? 0,
        is_active: is_active ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: genre,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建专题失败:", error);
    const message = error instanceof Error ? error.message : "创建专题失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
