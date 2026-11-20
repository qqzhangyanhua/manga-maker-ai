/**
 * Panel Batch Layout API
 *
 * PATCH /api/panel/batch-layout - Apply layout grouping to multiple panels (2镜/3镜/4镜/6镜)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type LayoutSize = "2" | "3" | "4" | "6";
type LayoutDirection = "h" | "v";
type LayoutRatio = string; // e.g., "1-2", "2-1", "1-2-1"

interface BatchLayoutRequest {
  panelIds: string[];
  layoutType: LayoutSize;
  direction?: LayoutDirection; // 2镜和3镜需要方向，默认横排
  ratio?: LayoutRatio; // 可选的比例，如 "1-2", "2-1", "1-2-1"
}

// 验证比例格式
function isValidRatio(ratio: string, size: LayoutSize): boolean {
  const parts = ratio.split("-");
  const expectedParts = parseInt(size, 10);

  if (parts.length !== expectedParts) return false;

  return parts.every((p) => {
    const num = parseInt(p, 10);
    return !isNaN(num) && num > 0 && num <= 10;
  });
}

// 获取默认比例
function getDefaultRatio(size: LayoutSize): string {
  switch (size) {
    case "2":
      return "1-1";
    case "3":
      return "1-1-1";
    default:
      return "";
  }
}

/**
 * PATCH /api/panel/batch-layout
 *
 * Apply layout grouping to multiple consecutive panels
 *
 * Body:
 * - panelIds: string[] (required, must match layoutType count: 2, 3, 4, or 6)
 * - layoutType: "2" | "3" | "4" | "6" (required)
 * - direction: "h" | "v" (optional, for 2镜/3镜, default "h")
 * - ratio: string (optional, e.g., "1-2", "2-1", "1-2-1")
 *
 * Rules:
 * - panelIds must be consecutive in panel_order
 * - panelIds count must match layoutType
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
    const { panelIds, layoutType, direction = "h", ratio } = body;

    // Validate layoutType
    const validLayoutTypes: LayoutSize[] = ["2", "3", "4", "6"];
    if (!layoutType || !validLayoutTypes.includes(layoutType)) {
      return NextResponse.json(
        { error: "无效的布局类型，支持: 2镜, 3镜, 4镜, 6镜" },
        { status: 400 }
      );
    }

    // Validate direction for 2镜 and 3镜
    if ((layoutType === "2" || layoutType === "3") && direction !== "h" && direction !== "v") {
      return NextResponse.json(
        { error: "无效的布局方向，支持: h(横排), v(竖排)" },
        { status: 400 }
      );
    }

    // Validate ratio if provided
    if (ratio && (layoutType === "2" || layoutType === "3")) {
      if (!isValidRatio(ratio, layoutType)) {
        return NextResponse.json(
          { error: `无效的布局比例格式，${layoutType}镜需要${layoutType}个数字，如 ${getDefaultRatio(layoutType)}` },
          { status: 400 }
        );
      }
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

    // 章节各自从 1 编号后，不同章节的 panel_order 也会连号，不能据此当成同一组
    const chapterIds = new Set(panels.map((panel) => panel.chapter_id));
    if (chapterIds.size > 1) {
      return NextResponse.json(
        { error: "所选分镜不在同一章节，请选择同一章节内的连续分镜" },
        { status: 400 }
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

    // 保存之前的 layout_hint 值（用于撤销）
    const previousHints = sortedPanels.map((p) => ({
      id: p.id,
      hint: p.layout_hint,
    }));

    // Build layout_hint value
    // For 2镜/3镜: group_start_{size}_{direction}[_{ratio}] (e.g., group_start_2_h, group_start_2_h_1-2)
    // For 4镜/6镜: group_start_{size} (no direction needed)
    let layoutHintValue: string;
    if (layoutType === "2" || layoutType === "3") {
      layoutHintValue = `group_start_${layoutType}_${direction}`;
      // 只有非默认比例才添加到 hint 中
      if (ratio && ratio !== getDefaultRatio(layoutType)) {
        layoutHintValue += `_${ratio}`;
      }
    } else {
      layoutHintValue = `group_start_${layoutType}`;
    }

    // Apply layout in a transaction
    await prisma.$transaction([
      // Set first panel as group start
      prisma.panel.update({
        where: { id: sortedPanelIds[0] },
        data: { layout_hint: layoutHintValue },
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

    // Build display name
    const directionName = direction === "h" ? "横排" : "竖排";
    let displayName = (layoutType === "2" || layoutType === "3")
      ? `${layoutType}镜${directionName}`
      : `${layoutType}镜`;

    // 添加比例信息到显示名称
    if (ratio && ratio !== getDefaultRatio(layoutType)) {
      displayName += ` (${ratio.replace(/-/g, ":")})`;
    }

    return NextResponse.json({
      success: true,
      data: {
        layoutType,
        direction: (layoutType === "2" || layoutType === "3") ? direction : null,
        ratio: ratio || null,
        panelCount: updatedPanels.length,
        panels: updatedPanels,
        previousHints, // 用于撤销
      },
      message: `成功创建 ${displayName} 布局组`,
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
