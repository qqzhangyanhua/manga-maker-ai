import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/prompt-templates/[id]/duplicate
 * 复制模板
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;

    // 获取原模板
    const original = await prisma.writingPromptTemplate.findUnique({
      where: { id },
      include: {
        slots: true,
      },
    });

    if (!original) {
      return NextResponse.json(
        { success: false, message: "模板不存在" },
        { status: 404 }
      );
    }

    // 生成新的 code
    const timestamp = Date.now();
    const newCode = `${original.code}_copy_${timestamp}`;

    // 创建副本
    const duplicate = await prisma.writingPromptTemplate.create({
      data: {
        code: newCode,
        name: `${original.name} (副本)`,
        description: original.description,
        phase: original.phase,
        category: original.category,
        genre: original.genre,
        function_code: original.function_code,
        system_role: original.system_role,
        chain_of_thought: original.chain_of_thought as object,
        output_schema: original.output_schema as object | null,
        sort_order: original.sort_order,
        is_active: false, // 副本默认禁用
        usage_count: 0,
        // 复制插槽
        slots: {
          create: original.slots.map((slot) => ({
            name: slot.name,
            display_name: slot.display_name,
            description: slot.description,
            slot_type: slot.slot_type,
            data_type: slot.data_type,
            required: slot.required,
            default_value: slot.default_value,
            options: slot.options as object | null,
          })),
        },
      },
      include: {
        slots: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: duplicate,
      message: "复制成功",
    });
  } catch (error) {
    console.error("复制模板失败:", error);
    const message = error instanceof Error ? error.message : "复制模板失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
