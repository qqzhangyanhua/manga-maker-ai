import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/projects/[id]
 * 删除单个项目（级联删除面板）
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: { panels: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: "项目不存在" },
        { status: 404 }
      );
    }

    // 删除项目（级联删除面板、脚本等）
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `删除成功，同时删除了 ${project._count.panels} 个面板`,
    });
  } catch (error) {
    console.error("删除项目失败:", error);
    const message = error instanceof Error ? error.message : "删除项目失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
