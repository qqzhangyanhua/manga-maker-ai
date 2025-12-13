import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/generated-images/[id]
 * 删除单个生成图片
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;

    // 检查图片是否存在
    const image = await prisma.generatedImage.findUnique({
      where: { id },
    });

    if (!image) {
      return NextResponse.json(
        { success: false, message: "图片不存在" },
        { status: 404 }
      );
    }

    // 删除图片记录
    await prisma.generatedImage.delete({
      where: { id },
    });

    // TODO: 同时删除 MinIO 中的实际文件（如果需要）

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除图片失败:", error);
    const message = error instanceof Error ? error.message : "删除图片失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
