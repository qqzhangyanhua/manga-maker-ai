import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateTemplateSchema = z.object({
  name: z.string().min(1, "模板名称不能为空").max(100).optional(),
  description: z.string().optional(),
  panel_count: z.number().int().min(1).max(50).optional(),
  template_data: z.record(z.unknown()).optional(), // JSON object
  tags: z.array(z.string()).optional(),
  thumbnail_url: z.string().optional(),
  is_public: z.boolean().optional(),
  is_official: z.boolean().optional(),
});

// GET /api/admin/panel-templates/:id - 获取单个模板详情
export async function GET(req: NextRequest, context: RouteContext) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await context.params;

    const template = await prisma.panelTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: "模板不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("[GET /api/admin/panel-templates/:id]", error);
    return NextResponse.json(
      { error: "获取模板详情失败" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/panel-templates/:id - 更新模板
export async function PATCH(req: NextRequest, context: RouteContext) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const validated = updateTemplateSchema.parse(body);

    // 检查模板是否存在
    const existing = await prisma.panelTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "模板不存在" },
        { status: 404 }
      );
    }

    // 准备更新数据
    const updateData: Record<string, unknown> = {
      ...validated,
      updated_at: new Date(),
    };

    // 处理 is_official 字段：官方模板 user_id = null
    if (validated.is_official !== undefined) {
      updateData.user_id = validated.is_official ? null : adminCheck.userId;
    }

    const updated = await prisma.panelTemplate.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.panelTemplate.update>[0]['data'],
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[PATCH /api/admin/panel-templates/:id]", error);
    return NextResponse.json(
      { error: "更新模板失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/panel-templates/:id - 删除模板
export async function DELETE(req: NextRequest, context: RouteContext) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await context.params;

    // 检查模板是否存在
    const existing = await prisma.panelTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "模板不存在" },
        { status: 404 }
      );
    }

    await prisma.panelTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("[DELETE /api/admin/panel-templates/:id]", error);
    return NextResponse.json(
      { error: "删除模板失败" },
      { status: 500 }
    );
  }
}
