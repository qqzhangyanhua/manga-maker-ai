import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTaskStatus } from "@/lib/unified-image-generation";

/**
 * PATCH /api/panel/variants/[id]/select
 * Select a variant as the main panel image
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await req.json();
    const { panel_id } = body;

    if (!panel_id) {
      return NextResponse.json(
        { error: "缺少 panel_id" },
        { status: 400 }
      );
    }

    // Get panel and verify ownership
    const panel = await prisma.panel.findUnique({
      where: { id: panel_id },
      include: { project: true },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // Get task status to retrieve image URL
    const taskStatus = await getTaskStatus(taskId);

    if (taskStatus.status !== "completed") {
      return NextResponse.json(
        { error: "变体生成未完成" },
        { status: 400 }
      );
    }

    if (!taskStatus.imageUrl) {
      return NextResponse.json(
        { error: "变体图片不存在" },
        { status: 404 }
      );
    }

    // Update panel with selected variant image
    const updatedPanel = await prisma.panel.update({
      where: { id: panel_id },
      data: {
        generated_image: taskStatus.imageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      panel: updatedPanel,
      message: "已选择该变体作为主图",
    });
  } catch (error) {
    console.error("Select variant error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
