import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: z.enum(["system", "user"]).optional(),
  category: z.string().max(50).nullable().optional(),
});

/**
 * PATCH /api/admin/tags/[id]
 * 更新标签
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = updateTagSchema.safeParse(body);

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

    // 检查标签是否存在
    const tag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, message: "标签不存在" },
        { status: 404 }
      );
    }

    const { name, type, category } = validation.data;

    // 如果更新名称，检查是否重复
    if (name && name !== tag.name) {
      const existing = await prisma.tag.findUnique({
        where: { name },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, message: "标签名称已存在" },
          { status: 400 }
        );
      }
    }

    // 更新标签
    const updated = await prisma.tag.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(category !== undefined && { category }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新标签失败:", error);
    const message = error instanceof Error ? error.message : "更新标签失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/tags/[id]
 * 删除标签
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;

    // 检查标签是否存在
    const tag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, message: "标签不存在" },
        { status: 404 }
      );
    }

    // 删除标签（级联删除 taggings）
    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除标签失败:", error);
    const message = error instanceof Error ? error.message : "删除标签失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
