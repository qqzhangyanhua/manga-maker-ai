import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * PUT /api/panel/reorder - 重排序分镜
 *
 * 请求体：
 * {
 *   panel_id: string;
 *   new_order: number;
 *   project_id: string;
 * }
 */
export async function PUT(req: Request) {
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

    const body = await req.json();
    const { panel_id, new_order, project_id } = body;

    // 参数验证 - 使用 undefined 检查避免 0 被误判为缺失
    if (!panel_id || new_order === undefined || new_order === null || !project_id) {
      return NextResponse.json(
        { error: "缺少必需参数：panel_id, new_order, project_id" },
        { status: 400 }
      );
    }

    if (typeof new_order !== "number" || new_order < 1) {
      return NextResponse.json(
        { error: "new_order 必须是大于 0 的整数" },
        { status: 400 }
      );
    }

    // 检查 panel 是否存在且属于当前用户
    const existingPanel = await prisma.panel.findUnique({
      where: { id: panel_id },
      include: { project: true },
    });

    if (!existingPanel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (existingPanel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作此分镜" }, { status: 403 });
    }

    if (existingPanel.project_id !== project_id) {
      return NextResponse.json({ error: "分镜不属于指定项目" }, { status: 400 });
    }

    const old_order = existingPanel.panel_order;

    // 如果顺序没有变化，直接返回
    if (old_order === new_order) {
      return NextResponse.json({
        success: true,
        panel: existingPanel,
        message: "顺序未改变",
      });
    }

    // 获取项目的所有 panels 数量，验证 new_order 是否有效
    const totalPanels = await prisma.panel.count({
      where: { project_id },
    });

    if (new_order > totalPanels) {
      return NextResponse.json(
        { error: `new_order 超出范围，项目共有 ${totalPanels} 个分镜` },
        { status: 400 }
      );
    }

    // 使用事务更新 panel 顺序
    await prisma.$transaction(async (tx) => {
      if (new_order < old_order) {
        // 向前移动：将 [new_order, old_order) 之间的 panels 的 order +1
        await tx.$executeRaw`
          UPDATE panels
          SET panel_order = panel_order + 1
          WHERE project_id = ${project_id}::uuid
          AND panel_order >= ${new_order}
          AND panel_order < ${old_order}
        `;
      } else {
        // 向后移动：将 (old_order, new_order] 之间的 panels 的 order -1
        await tx.$executeRaw`
          UPDATE panels
          SET panel_order = panel_order - 1
          WHERE project_id = ${project_id}::uuid
          AND panel_order > ${old_order}
          AND panel_order <= ${new_order}
        `;
      }

      // 更新目标 panel 的 order
      await tx.panel.update({
        where: { id: panel_id },
        data: { panel_order: new_order },
      });
    });

    // 查询更新后的 panel
    const updatedPanel = await prisma.panel.findUnique({
      where: { id: panel_id },
    });

    return NextResponse.json({
      success: true,
      panel: updatedPanel,
      message: "分镜顺序已更新",
    });
  } catch (error) {
    console.error("Reorder panel error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
