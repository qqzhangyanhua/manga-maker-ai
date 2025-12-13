/**
 * Panel Break Layout API
 *
 * PATCH /api/panel/break-layout - Break a layout group, restoring panels to independent state
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface BreakLayoutRequest {
  panelId: string;
}

/**
 * PATCH /api/panel/break-layout
 *
 * Break a layout group by providing any panel ID within the group.
 * All panels in the group will be restored to independent state (layout_hint = null).
 *
 * Body:
 * - panelId: string (required, any panel within the layout group)
 *
 * Logic:
 * 1. If panelId has layout_hint = "group_start_N", find all following "group_member" panels
 * 2. If panelId has layout_hint = "group_member", find the preceding "group_start_N" and all members
 * 3. Reset all panels in the group to layout_hint = null
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
    const body: BreakLayoutRequest = await req.json();
    const { panelId } = body;

    if (!panelId) {
      return NextResponse.json(
        { error: "请提供要拆分的分镜ID" },
        { status: 400 }
      );
    }

    // Get the target panel
    const targetPanel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        project: {
          select: {
            id: true,
            user_id: true,
          },
        },
      },
    });

    if (!targetPanel) {
      return NextResponse.json(
        { error: "未找到指定的分镜" },
        { status: 404 }
      );
    }

    // Verify user owns the project
    if (targetPanel.project.user_id !== payload.userId) {
      return NextResponse.json(
        { error: "无权限操作该项目" },
        { status: 403 }
      );
    }

    // Check if panel is in a layout group
    if (!targetPanel.layout_hint) {
      return NextResponse.json(
        { error: "该分镜不在布局组中" },
        { status: 400 }
      );
    }

    // Get all panels in the same project, ordered by panel_order
    const allPanels = await prisma.panel.findMany({
      where: { project_id: targetPanel.project_id },
      orderBy: { panel_order: "asc" },
      select: {
        id: true,
        panel_order: true,
        layout_hint: true,
      },
    });

    // Find the layout group boundaries
    const panelIdsToReset: string[] = [];
    const targetIndex = allPanels.findIndex((p) => p.id === panelId);

    if (targetPanel.layout_hint.startsWith("group_start_")) {
      // Target is group start, find all following group_members
      panelIdsToReset.push(targetPanel.id);

      for (let i = targetIndex + 1; i < allPanels.length; i++) {
        const panel = allPanels[i];
        if (panel.layout_hint === "group_member") {
          panelIdsToReset.push(panel.id);
        } else {
          // Reached end of group (next group_start or independent panel)
          break;
        }
      }
    } else if (targetPanel.layout_hint === "group_member") {
      // Target is group member, find preceding group_start
      let groupStartIndex = -1;

      for (let i = targetIndex - 1; i >= 0; i--) {
        const panel = allPanels[i];
        if (panel.layout_hint?.startsWith("group_start_")) {
          groupStartIndex = i;
          break;
        } else if (panel.layout_hint !== "group_member") {
          // Reached a panel that's not part of any group
          break;
        }
      }

      if (groupStartIndex === -1) {
        // Orphaned group_member, just reset it
        panelIdsToReset.push(targetPanel.id);
      } else {
        // Found group start, collect all members from start to end
        for (let i = groupStartIndex; i < allPanels.length; i++) {
          const panel = allPanels[i];
          if (i === groupStartIndex) {
            panelIdsToReset.push(panel.id);
          } else if (panel.layout_hint === "group_member") {
            panelIdsToReset.push(panel.id);
          } else {
            break;
          }
        }
      }
    }

    if (panelIdsToReset.length === 0) {
      return NextResponse.json(
        { error: "未找到有效的布局组" },
        { status: 400 }
      );
    }

    // Reset all panels in the group
    await prisma.panel.updateMany({
      where: {
        id: { in: panelIdsToReset },
      },
      data: { layout_hint: null },
    });

    // Get updated panels for response
    const updatedPanels = await prisma.panel.findMany({
      where: {
        id: { in: panelIdsToReset },
      },
      orderBy: { panel_order: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        panelCount: updatedPanels.length,
        panels: updatedPanels,
      },
      message: `成功拆分布局组，${updatedPanels.length} 个分镜已恢复为独立状态`,
    });
  } catch (error) {
    console.error("Break layout error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `拆分布局失败: ${message}` },
      { status: 500 }
    );
  }
}
