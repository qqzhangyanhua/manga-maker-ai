import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/workflows/[id]
 * 更新工作流状态（取消）
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action: "cancel" | "retry" };

    // 检查工作流是否存在
    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, message: "工作流不存在" },
        { status: 404 }
      );
    }

    if (action === "cancel") {
      if (workflow.status === "completed" || workflow.status === "cancelled") {
        return NextResponse.json(
          { success: false, message: "该工作流无法取消" },
          { status: 400 }
        );
      }

      await prisma.workflow.update({
        where: { id },
        data: {
          status: "cancelled",
          updated_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "工作流已取消",
      });
    }

    if (action === "retry") {
      if (workflow.status !== "failed") {
        return NextResponse.json(
          { success: false, message: "只有失败的工作流可以重试" },
          { status: 400 }
        );
      }

      await prisma.workflow.update({
        where: { id },
        data: {
          status: "pending",
          error: null,
          progress: 0,
          updated_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "工作流已重置为待处理",
      });
    }

    return NextResponse.json(
      { success: false, message: "未知操作" },
      { status: 400 }
    );
  } catch (error) {
    console.error("更新工作流失败:", error);
    const message = error instanceof Error ? error.message : "更新工作流失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
