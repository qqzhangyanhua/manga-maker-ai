import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

const createTemplateSchema = z.object({
  name: z.string().min(1, "模板名称不能为空").max(100),
  category: z.enum(["suspense", "romance", "adventure", "scifi", "daily", "fantasy"]),
  description: z.string().optional(),
  structure: z.record(z.unknown()), // JSON object
  prompts: z.record(z.unknown()), // JSON object
  is_public: z.boolean().default(true),
  is_system: z.boolean().default(false), // 是否为系统模板 (user_id = null)
});

// GET /api/admin/story-templates - 管理员获取所有模板（包括系统和用户模板）
export async function GET(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const isPublic = searchParams.get("is_public");

    const where: {
      category?: string;
      is_public?: boolean;
    } = {};

    if (category) {
      where.category = category;
    }

    if (isPublic !== null && isPublic !== undefined) {
      where.is_public = isPublic === "true";
    }

    const templates = await prisma.storyTemplate.findMany({
      where,
      orderBy: [
        { usage_count: "desc" },
        { created_at: "desc" },
      ],
    });

    return NextResponse.json({ data: templates, total: templates.length });
  } catch (error) {
    console.error("[GET /api/admin/story-templates]", error);
    return NextResponse.json(
      { error: "获取模板列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/admin/story-templates - 管理员创建模板（系统或用户模板）
export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await req.json();
    const validated = createTemplateSchema.parse(body);

    const template = await prisma.storyTemplate.create({
      data: {
        name: validated.name,
        category: validated.category,
        description: validated.description,
        structure: validated.structure,
        prompts: validated.prompts,
        is_public: validated.is_public,
        user_id: validated.is_system ? null : adminCheck.userId, // null = 系统模板
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[POST /api/admin/story-templates]", error);
    return NextResponse.json(
      { error: "创建模板失败" },
      { status: 500 }
    );
  }
}
