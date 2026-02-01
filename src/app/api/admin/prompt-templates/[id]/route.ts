import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

// 思维链层级结构
const chainOfThoughtLevelSchema = z.object({
  level: z.string(),
  title: z.string(),
  content: z.array(z.string()),
});

const updateTemplateSchema = z.object({
  code: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  phase: z.string().min(1).max(50).optional(),
  category: z.string().min(1).max(50).optional(),
  genre: z.string().max(50).optional().nullable(),
  function_code: z.string().max(50).optional().nullable(),
  system_role: z.string().min(1).optional(),
  chain_of_thought: z.array(chainOfThoughtLevelSchema).optional(),
  output_schema: z.record(z.unknown()).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/prompt-templates/[id]
 * 获取单个模板详情（包含插槽）
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;

    const template = await prisma.writingPromptTemplate.findUnique({
      where: { id },
      include: {
        slots: {
          orderBy: [{ slot_type: "asc" }, { required: "desc" }],
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, message: "模板不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("获取模板详情失败:", error);
    const message = error instanceof Error ? error.message : "获取模板详情失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/prompt-templates/[id]
 * 更新模板
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = updateTemplateSchema.safeParse(body);

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

    // 检查模板是否存在
    const existing = await prisma.writingPromptTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "模板不存在" },
        { status: 404 }
      );
    }

    // 如果更新 code，检查是否与其他模板冲突
    if (validation.data.code && validation.data.code !== existing.code) {
      const codeConflict = await prisma.writingPromptTemplate.findUnique({
        where: { code: validation.data.code },
      });

      if (codeConflict) {
        return NextResponse.json(
          { success: false, message: "模板代码已存在" },
          { status: 400 }
        );
      }
    }

    // 更新模板
    const updateData: Record<string, unknown> = {
      ...validation.data,
      updated_at: new Date(),
    };
    
    // 处理 JSONB 字段类型
    if (validation.data.chain_of_thought) {
      updateData.chain_of_thought = validation.data.chain_of_thought as object;
    }
    if (validation.data.output_schema !== undefined) {
      updateData.output_schema = validation.data.output_schema ? (validation.data.output_schema as object) : null;
    }
    
    const template = await prisma.writingPromptTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: template,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新模板失败:", error);
    const message = error instanceof Error ? error.message : "更新模板失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/prompt-templates/[id]
 * 删除模板（级联删除插槽）
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;

    // 检查模板是否存在
    const existing = await prisma.writingPromptTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "模板不存在" },
        { status: 404 }
      );
    }

    // 删除模板（插槽会级联删除）
    await prisma.writingPromptTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除模板失败:", error);
    const message = error instanceof Error ? error.message : "删除模板失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
