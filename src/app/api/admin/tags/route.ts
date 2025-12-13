import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(["system", "user"]),
  category: z.string().max(50).optional(),
});

/**
 * GET /api/admin/tags
 * 获取标签列表（分页 + 过滤）
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { searchParams } = new URL(request.url);

    // 分页参数
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 200);
    const offset = (page - 1) * limit;

    // 过滤参数
    const keyword = searchParams.get("keyword")?.trim();
    const type = searchParams.get("type")?.trim();
    const category = searchParams.get("category")?.trim();

    // 构建查询条件
    const where: Prisma.TagWhereInput = {};

    if (keyword) {
      where.name = { contains: keyword, mode: "insensitive" };
    }

    if (type && type !== "all") {
      where.type = type;
    }

    if (category && category !== "all") {
      where.category = category;
    }

    // 执行查询
    const [total, tags] = await prisma.$transaction([
      prisma.tag.count({ where }),
      prisma.tag.findMany({
        where,
        orderBy: [{ usage_count: "desc" }, { name: "asc" }],
        skip: offset,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: tags,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取标签列表失败:", error);
    const message = error instanceof Error ? error.message : "获取标签列表失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * POST /api/admin/tags
 * 创建系统标签
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const body = await request.json();
    const validation = createTagSchema.safeParse(body);

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

    const { name, type, category } = validation.data;

    // 检查名称是否已存在
    const existing = await prisma.tag.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "标签名称已存在" },
        { status: 400 }
      );
    }

    // 创建标签
    const tag = await prisma.tag.create({
      data: {
        name,
        type,
        category: category || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: tag,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建标签失败:", error);
    const message = error instanceof Error ? error.message : "创建标签失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
