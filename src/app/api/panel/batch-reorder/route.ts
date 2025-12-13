/**
 * Panel Batch Reorder API
 *
 * PUT /api/panel/batch-reorder - 批量重排序多个分镜（支持布局组整体移动）
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface BatchReorderRequest {
  panel_ids: string[];
  target_order: number; // 目标位置（第一个panel的新位置）
  project_id: string;
}

/**
 * PUT /api/panel/batch-reorder
 *
 * 批量移动多个连续的分镜到新位置
 *
 * Body:
 * - panel_ids: string[] (required, 要移动的panel ID列表，按原顺序排列)
 * - target_order: number (required, 目标位置)
 * - project_id: string (required)
 *
 * 规则：
 * - panel_ids 中的 panels 必须是连续的
 * - 移动后保持 panels 的相对顺序不变
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

    const body: BatchReorderRequest = await req.json();
    const { panel_ids, target_order, project_id } = body;

    // 参数验证
    if (!panel_ids || !Array.isArray(panel_ids) || panel_ids.length === 0) {
      return NextResponse.json(
        { error: "缺少必需参数：panel_ids" },
        { status: 400 }
      );
    }

    if (target_order === undefined || target_order === null || typeof target_order !== "number" || target_order < 1) {
      return NextResponse.json(
        { error: "target_order 必须是大于 0 的整数" },
        { status: 400 }
      );
    }

    if (!project_id) {
      return NextResponse.json(
        { error: "缺少必需参数：project_id" },
        { status: 400 }
      );
    }

    // 获取所有要移动的 panels
    const panelsToMove = await prisma.panel.findMany({
      where: {
        id: { in: panel_ids },
        project_id,
      },
      include: {
        project: {
          select: { user_id: true },
        },
      },
      orderBy: { panel_order: "asc" },
    });

    if (panelsToMove.length !== panel_ids.length) {
      return NextResponse.json(
        { error: "部分分镜不存在或不属于指定项目" },
        { status: 404 }
      );
    }

    // 验证权限
    const userId = payload.userId;
    if (panelsToMove.some((p) => p.project.user_id !== userId)) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    // 验证 panels 是连续的
    const orders = panelsToMove.map((p) => p.panel_order).sort((a, b) => a - b);
    for (let i = 1; i < orders.length; i++) {
      if (orders[i] !== orders[i - 1] + 1) {
        return NextResponse.json(
          { error: "要移动的分镜必须是连续的" },
          { status: 400 }
        );
      }
    }

    // 获取项目总 panel 数量
    const totalPanels = await prisma.panel.count({
      where: { project_id },
    });

    // 验证 target_order 有效
    const groupSize = panelsToMove.length;
    const maxTargetOrder = totalPanels - groupSize + 1;
    if (target_order > maxTargetOrder) {
      return NextResponse.json(
        { error: `target_order 超出范围，最大值为 ${maxTargetOrder}` },
        { status: 400 }
      );
    }

    const oldStartOrder = orders[0];
    const oldEndOrder = orders[orders.length - 1];

    // 如果位置没变，直接返回
    if (oldStartOrder === target_order) {
      return NextResponse.json({
        success: true,
        message: "顺序未改变",
      });
    }

    // 使用事务进行批量更新
    await prisma.$transaction(async (tx) => {
      // 先将要移动的 panels 的 order 设为负数（临时值，避免冲突）
      for (let i = 0; i < panelsToMove.length; i++) {
        await tx.panel.update({
          where: { id: panelsToMove[i].id },
          data: { panel_order: -(i + 1) },
        });
      }

      if (target_order < oldStartOrder) {
        // 向前移动：将 [target_order, oldStartOrder) 的 panels 向后移动 groupSize 位
        await tx.$executeRaw`
          UPDATE panels
          SET panel_order = panel_order + ${groupSize}
          WHERE project_id = ${project_id}::uuid
          AND panel_order >= ${target_order}
          AND panel_order < ${oldStartOrder}
        `;
      } else {
        // 向后移动：将 (oldEndOrder, target_order + groupSize - 1] 的 panels 向前移动 groupSize 位
        const targetEnd = target_order + groupSize - 1;
        await tx.$executeRaw`
          UPDATE panels
          SET panel_order = panel_order - ${groupSize}
          WHERE project_id = ${project_id}::uuid
          AND panel_order > ${oldEndOrder}
          AND panel_order <= ${targetEnd}
        `;
      }

      // 将要移动的 panels 设置为目标位置
      for (let i = 0; i < panelsToMove.length; i++) {
        await tx.panel.update({
          where: { id: panelsToMove[i].id },
          data: { panel_order: target_order + i },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `成功移动 ${groupSize} 个分镜`,
    });
  } catch (error) {
    console.error("Batch reorder panels error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
