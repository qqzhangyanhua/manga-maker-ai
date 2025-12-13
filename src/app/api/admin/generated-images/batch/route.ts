import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const batchDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "至少选择一张图片"),
});

/**
 * DELETE /api/admin/generated-images/batch
 * 批量删除生成图片
 */
export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const body = await request.json();
    const validation = batchDeleteSchema.safeParse(body);

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

    const { ids } = validation.data;

    // 批量删除图片记录
    const result = await prisma.generatedImage.deleteMany({
      where: { id: { in: ids } },
    });

    // TODO: 同时删除 MinIO 中的实际文件（如果需要）

    return NextResponse.json({
      success: true,
      message: `成功删除 ${result.count} 张图片`,
      data: { deletedCount: result.count },
    });
  } catch (error) {
    console.error("批量删除图片失败:", error);
    const message = error instanceof Error ? error.message : "批量删除图片失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
