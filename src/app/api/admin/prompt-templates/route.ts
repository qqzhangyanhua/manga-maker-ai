import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

// 思维链层级结构
const chainOfThoughtLevelSchema = z.object({
  level: z.string(),
  title: z.string(),
  content: z.array(z.string()),
});

const createTemplateSchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  phase: z.string().min(1).max(50),
  category: z.string().min(1).max(50),
  genre: z.string().max(50).optional().nullable(),
  function_code: z.string().max(50).optional().nullable(),
  system_role: z.string().min(1),
  chain_of_thought: z.array(chainOfThoughtLevelSchema).optional(),
  output_schema: z.record(z.unknown()).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/admin/prompt-templates
 * 获取提示词模板列表（分页 + 过滤）
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { searchParams } = new URL(request.url);

    // 分页参数
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20), 1), 100);
    const offset = (page - 1) * limit;

    // 过滤参数
    const phase = searchParams.get("phase")?.trim();
    const genre = searchParams.get("genre")?.trim();
    const function_code = searchParams.get("function_code")?.trim();
    const search = searchParams.get("search")?.trim();
    const includeInactive = searchParams.get("includeInactive") === "true";

    // 构建查询条件
    const where: Prisma.WritingPromptTemplateWhereInput = {};

    if (!includeInactive) {
      where.is_active = true;
    }

    if (phase && phase !== "all") {
      where.phase = phase;
    }

    if (genre) {
      if (genre === "general") {
        where.genre = null;
      } else if (genre !== "all") {
        where.genre = genre;
      }
    }

    if (function_code && function_code !== "all") {
      where.function_code = function_code;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    // 执行查询
    const [total, templates] = await prisma.$transaction([
      prisma.writingPromptTemplate.count({ where }),
      prisma.writingPromptTemplate.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          phase: true,
          category: true,
          genre: true,
          function_code: true,
          sort_order: true,
          usage_count: true,
          is_active: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [{ sort_order: "asc" }, { usage_count: "desc" }],
        skip: offset,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: templates,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取模板列表失败:", error);
    const message = error instanceof Error ? error.message : "获取模板列表失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * POST /api/admin/prompt-templates
 * 创建提示词模板
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const body = await request.json();
    const validation = createTemplateSchema.safeParse(body);

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

    const {
      code,
      name,
      description,
      phase,
      category,
      genre,
      function_code,
      system_role,
      chain_of_thought,
      output_schema,
      sort_order,
      is_active,
    } = validation.data;

    // 检查 code 是否已存在
    const existing = await prisma.writingPromptTemplate.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "模板代码已存在" },
        { status: 400 }
      );
    }

    // 创建模板
    const template = await prisma.writingPromptTemplate.create({
      data: {
        code,
        name,
        description: description || null,
        phase,
        category,
        genre: genre || null,
        function_code: function_code || null,
        system_role,
        chain_of_thought: (chain_of_thought || []) as object,
        output_schema: output_schema ? (output_schema as object) : undefined,
        sort_order: sort_order ?? 0,
        is_active: is_active ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: template,
      message: "创建成功",
    });
  } catch (error) {
    console.error("创建模板失败:", error);
    const message = error instanceof Error ? error.message : "创建模板失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
