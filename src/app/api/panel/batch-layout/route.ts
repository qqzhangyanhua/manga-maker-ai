/**
 * Panel Batch Layout API
 *
 * PATCH /api/panel/batch-layout - Apply layout grouping to multiple panels (2镜/4镜/6镜)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type LayoutType = "2" | "4" | "6";

interface BatchLayoutRequest {
  panelIds: string[];
  layoutType: LayoutType;
}

/**
 * PATCH /api/panel/batch-layout
 *
 * Apply layout grouping to multiple consecutive panels
 *
 * Body:
 * - panelIds: string[] (required, must match layoutType count: 2, 4, or 6)
 * - layoutType: "2" | "4" | "6" (required)
 *
 * Rules:
 * - panelIds must be consecutive in panel_order
 * - panelIds count must match layoutType (2 for "2", 4 for "4", 6 for "6")
 * - All panels must belong to the same project
 * - User must own the project
 */
export async function PATCH(req: Request) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // Parse request body
    const body: BatchLayoutRequest = await req.json();
    const { panelIds, layoutType } = body;

    // Validate layoutType
    const validLayoutTypes: LayoutType[] = ["2", "4", "6"];
    if (!layoutType || !validLayoutTypes.includes(layoutType)) {
      return NextResponse.json(
        { error: "无效的布局类型，支持: 2镜, 4镜, 6镜" },
        { status: 400 }
      );
    }

    const expectedCount = parseInt(layoutType, 10);

    // Validate panelIds
    if (!panelIds || !Array.isArray(panelIds) || panelIds.length === 0) {
      return NextResponse.json(
        { error: "请选择要组合的分镜" },
        { status: 400 }
      );
    }

    if (panelIds.length !== expectedCount) {
      return NextResponse.json(
        { error: `${layoutType}镜布局需要选择 ${expectedCount} 个分镜，当前选择了 ${panelIds.length} 个` },
        { status: 400 }
      );
    }

    // Get panels and verify ownership
    const panels = await prisma.panel.findMany({
      where: {
        id: { in: panelIds },
      },
      include: {
        project: {
          select: {
            id: true,
            user_id: true,
          },
        },
      },
      orderBy: { panel_order: "asc" },
    });

    if (panels.length !== expectedCount) {
      return NextResponse.json(
        { error: `未找到所有分镜，期望 ${expectedCount} 个，找到 ${panels.length} 个` },
        { status: 404 }
      );
    }

    // Verify all panels belong to the same project
    const projectIds = [...new Set(panels.map((p) => p.project_id))];
    if (projectIds.length > 1) {
      return NextResponse.json(
        { error: "只能组合同一项目的分镜" },
        { status: 400 }
      );
    }

    const project = panels[0].project;

    // Verify user owns the project
    if (project.user_id !== payload.userId) {
      return NextResponse.json(
        { error: "无权限操作该项目" },
        { status: 403 }
      );
    }

    // Verify panels are consecutive by panel_order
    const orders = panels.map((p) => p.panel_order).sort((a, b) => a - b);
    for (let i = 1; i < orders.length; i++) {
      if (orders[i] !== orders[i - 1] + 1) {
        return NextResponse.json(
          { error: "请选择连续的分镜进行组合" },
          { status: 400 }
        );
      }
    }

    // Sort panels by panel_order to ensure correct ordering
    const sortedPanels = [...panels].sort((a, b) => a.panel_order - b.panel_order);
    const sortedPanelIds = sortedPanels.map((p) => p.id);

    // Apply layout in a transaction
    await prisma.$transaction([
      // Set first panel as group start
      prisma.panel.update({
        where: { id: sortedPanelIds[0] },
        data: { layout_hint: `group_start_${layoutType}` },
      }),
      // Set remaining panels as group members
      prisma.panel.updateMany({
        where: {
          id: { in: sortedPanelIds.slice(1) },
        },
        data: { layout_hint: "group_member" },
      }),
    ]);

    // Get updated panels for response
    const updatedPanels = await prisma.panel.findMany({
      where: {
        id: { in: panelIds },
      },
      orderBy: { panel_order: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        layoutType,
        panelCount: updatedPanels.length,
        panels: updatedPanels,
      },
      message: `成功创建 ${layoutType}镜 布局组`,
    });
  } catch (error) {
    console.error("Batch layout panels error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `应用布局失败: ${message}` },
      { status: 500 }
    );
  }
}
