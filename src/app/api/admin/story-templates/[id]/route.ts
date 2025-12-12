import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateTemplateSchema = z.object({
  name: z.string().min(1, "模板名称不能为空").max(100).optional(),
  category: z.enum(["suspense", "romance", "adventure", "scifi", "daily", "fantasy"]).optional(),
  description: z.string().optional(),
  structure: z.record(z.unknown()).optional(), // JSON object
  prompts: z.record(z.unknown()).optional(), // JSON object
  is_public: z.boolean().optional(),
  is_system: z.boolean().optional(), // 是否为系统模板
});

// GET /api/admin/story-templates/:id - 获取单个模板详情
export async function GET(req: NextRequest, context: RouteContext) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await context.params;

    const template = await prisma.storyTemplate.findUnique({
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
    console.error("[GET /api/admin/story-templates/:id]", error);
    return NextResponse.json(
      { error: "获取模板详情失败" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/story-templates/:id - 更新模板
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
    const existing = await prisma.storyTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "模板不存在" },
        { status: 404 }
      );
    }

    // 准备更新数据
    const updateData: {
      name?: string;
      category?: string;
      description?: string;
      structure?: Record<string, unknown>;
      prompts?: Record<string, unknown>;
      is_public?: boolean;
      user_id?: string | null;
      updated_at: Date;
    } = {
      ...validated,
      updated_at: new Date(),
    };

    // 处理 is_system 字段
    if (validated.is_system !== undefined) {
      updateData.user_id = validated.is_system ? null : adminCheck.userId;
    }

    // 移除 is_system 字段（不存在于数据库）
    // @ts-expect-error - is_system is not in database schema
    delete updateData.is_system;

    const updated = await prisma.storyTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[PATCH /api/admin/story-templates/:id]", error);
    return NextResponse.json(
      { error: "更新模板失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/story-templates/:id - 删除模板
export async function DELETE(req: NextRequest, context: RouteContext) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) {
    return adminCheck;
  }

  try {
    const { id } = await context.params;

    // 检查模板是否存在
    const existing = await prisma.storyTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "模板不存在" },
        { status: 404 }
      );
    }

    await prisma.storyTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("[DELETE /api/admin/story-templates/:id]", error);
    return NextResponse.json(
      { error: "删除模板失败" },
      { status: 500 }
    );
  }
}
