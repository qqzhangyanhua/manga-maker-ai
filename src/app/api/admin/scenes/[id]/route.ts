import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/scenes/[id]
 * 删除单个场景
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;

    // 检查场景是否存在
    const scene = await prisma.scene.findUnique({
      where: { id },
    });

    if (!scene) {
      return NextResponse.json(
        { success: false, message: "场景不存在" },
        { status: 404 }
      );
    }

    // 删除场景记录
    await prisma.scene.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除场景失败:", error);
    const message = error instanceof Error ? error.message : "删除场景失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
