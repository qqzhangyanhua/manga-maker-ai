import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

const createTemplateSchema = z.object({
  name: z.string().min(1, "模板名称不能为空").max(100),
  description: z.string().optional(),
  panel_count: z.number().int().min(1).max(50),
  template_data: z.record(z.unknown()), // JSON object
  tags: z.array(z.string()).default([]),
  thumbnail_url: z.string().optional(),
  is_public: z.boolean().default(false),
  is_official: z.boolean().default(false), // 是否为官方模板
});

// GET /api/admin/panel-templates - 管理员获取所有模板（包括官方和用户模板）
export async function GET(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { searchParams } = new URL(req.url);
    const isPublic = searchParams.get("is_public");
    const isOfficial = searchParams.get("is_official");

    const where: {
      is_public?: boolean;
      is_official?: boolean;
    } = {};

    if (isPublic !== null && isPublic !== undefined) {
      where.is_public = isPublic === "true";
    }

    if (isOfficial !== null && isOfficial !== undefined) {
      where.is_official = isOfficial === "true";
    }

    const templates = await prisma.panelTemplate.findMany({
      where,
      orderBy: [
        { is_official: "desc" },
        { usage_count: "desc" },
        { created_at: "desc" },
      ],
    });

    return NextResponse.json({ data: templates, total: templates.length });
  } catch (error) {
    console.error("[GET /api/admin/panel-templates]", error);
    return NextResponse.json(
      { error: "获取模板列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/admin/panel-templates - 管理员创建模板
export async function POST(req: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const body = await req.json();
    const validated = createTemplateSchema.parse(body);

    const template = await prisma.panelTemplate.create({
      data: {
        name: validated.name,
        description: validated.description,
        panel_count: validated.panel_count,
        template_data: validated.template_data,
        tags: validated.tags,
        thumbnail_url: validated.thumbnail_url,
        is_public: validated.is_public,
        is_official: validated.is_official,
        user_id: validated.is_official ? null : adminCheck.userId, // null = 官方模板
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

    console.error("[POST /api/admin/panel-templates]", error);
    return NextResponse.json(
      { error: "创建模板失败" },
      { status: 500 }
    );
  }
}
