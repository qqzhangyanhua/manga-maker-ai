import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/stories/[id]
 * 删除单个故事
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;

    // 检查故事是否存在
    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    });

    if (!story) {
      return NextResponse.json(
        { success: false, message: "故事不存在" },
        { status: 404 }
      );
    }

    // 警告：如果有关联的项目，需要先处理
    if (story._count.projects > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `该故事有 ${story._count.projects} 个关联项目，无法直接删除。请先删除关联项目。`,
        },
        { status: 400 }
      );
    }

    // 删除故事记录（级联删除 story_characters）
    await prisma.story.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除故事失败:", error);
    const message = error instanceof Error ? error.message : "删除故事失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
