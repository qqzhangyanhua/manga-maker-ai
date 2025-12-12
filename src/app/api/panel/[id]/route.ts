import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const panelId = params.id;

    // 检查 panel 是否存在且属于当前用户
    const existingPanel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: { project: true },
    });

    if (!existingPanel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (existingPanel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限修改此分镜" }, { status: 403 });
    }

    const body = await req.json();
    const {
      visual_prompt,
      dialogue,
      camera_angle,
      shot_size,
      description,
      panel_type,
      importance,
      character_name,
      emotion,
      prompt_used,
      // Phase 2: Asset binding fields
      character_id,
      expression_type,
      outfit_id,
      scene_id,
    } = body;

    // 更新 panel
    const updatedPanel = await prisma.panel.update({
      where: { id: panelId },
      data: {
        ...(visual_prompt !== undefined && { visual_prompt }),
        ...(dialogue !== undefined && { dialogue }),
        ...(camera_angle !== undefined && { camera_angle }),
        ...(shot_size !== undefined && { shot_size }),
        ...(description !== undefined && { description }),
        ...(panel_type !== undefined && { panel_type }),
        ...(importance !== undefined && { importance }),
        ...(character_name !== undefined && { character_name }),
        ...(emotion !== undefined && { emotion }),
        ...(prompt_used !== undefined && { prompt_used }),
        // Phase 2: Asset binding fields
        ...(character_id !== undefined && { character_id }),
        ...(expression_type !== undefined && { expression_type }),
        ...(outfit_id !== undefined && { outfit_id }),
        ...(scene_id !== undefined && { scene_id }),
      },
    });

    return NextResponse.json({
      success: true,
      panel: updatedPanel,
      message: "分镜已更新",
    });
  } catch (error) {
    console.error("Update panel error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const panelId = params.id;

    // 检查 panel 是否存在且属于当前用户
    const existingPanel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: { project: true },
    });

    if (!existingPanel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (existingPanel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限删除此分镜" }, { status: 403 });
    }

    // 删除 panel
    await prisma.panel.delete({
      where: { id: panelId },
    });

    // 重新排序后续 panels
    await prisma.$executeRaw`
      UPDATE panels
      SET panel_order = panel_order - 1
      WHERE project_id = ${existingPanel.project_id}::uuid
      AND panel_order > ${existingPanel.panel_order}
    `;

    return NextResponse.json({
      success: true,
      message: "分镜已删除",
    });
  } catch (error) {
    console.error("Delete panel error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
