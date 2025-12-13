import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/generation-tasks/[id]
 * 取消生成任务
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action: "cancel" };

    // 检查任务是否存在
    const task = await prisma.generationTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, message: "任务不存在" },
        { status: 404 }
      );
    }

    if (action === "cancel") {
      if (task.status === "completed" || task.status === "cancelled") {
        return NextResponse.json(
          { success: false, message: "该任务无法取消" },
          { status: 400 }
        );
      }

      await prisma.generationTask.update({
        where: { id },
        data: {
          status: "cancelled",
          updated_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "任务已取消",
      });
    }

    return NextResponse.json(
      { success: false, message: "未知操作" },
      { status: 400 }
    );
  } catch (error) {
    console.error("更新任务失败:", error);
    const message = error instanceof Error ? error.message : "更新任务失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
