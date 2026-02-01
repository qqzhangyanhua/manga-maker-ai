import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateGenreSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, "code 只能包含小写字母、数字和下划线").optional(),
  display_name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/genres/[id]
 * 获取单个专题详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;

    const genre = await prisma.genre.findUnique({
      where: { id },
    });

    if (!genre) {
      return NextResponse.json(
        { success: false, message: "专题不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: genre,
    });
  } catch (error) {
    console.error("获取专题详情失败:", error);
    const message = error instanceof Error ? error.message : "获取专题详情失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/genres/[id]
 * 更新专题
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const body = await request.json();
    const validation = updateGenreSchema.safeParse(body);

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

    // 检查专题是否存在
    const existing = await prisma.genre.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "专题不存在" },
        { status: 404 }
      );
    }

    // 如果更新 code，检查是否与其他专题冲突
    if (validation.data.code && validation.data.code !== existing.code) {
      const codeConflict = await prisma.genre.findUnique({
        where: { code: validation.data.code },
      });

      if (codeConflict) {
        return NextResponse.json(
          { success: false, message: "专题代码已存在" },
          { status: 400 }
        );
      }
    }

    // 更新专题
    const genre = await prisma.genre.update({
      where: { id },
      data: {
        ...validation.data,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: genre,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新专题失败:", error);
    const message = error instanceof Error ? error.message : "更新专题失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/genres/[id]
 * 删除专题
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;

    // 检查专题是否存在
    const existing = await prisma.genre.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "专题不存在" },
        { status: 404 }
      );
    }

    // 删除专题
    await prisma.genre.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除专题失败:", error);
    const message = error instanceof Error ? error.message : "删除专题失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
