/**
 * Panel Batch Update API
 *
 * POST /api/panel/batch-update - Update multiple panels' properties
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface PanelUpdateData {
  panel_type?: string;
  importance?: string;
  camera_angle?: string;
  shot_size?: string;
  // Phase 2: Asset binding fields
  character_id?: string;
  expression_type?: string;
  outfit_id?: string;
  scene_id?: string;
}

/**
 * POST /api/panel/batch-update
 *
 * Update properties for multiple panels
 *
 * Body:
 * - panelIds: string[] (required, 1-50 panel IDs)
 * - updates: PanelUpdateData (required, at least one field)
 */
export async function POST(req: Request) {
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
    const body = await req.json();
    const { panelIds, updates } = body;

    // Validate input
    if (!panelIds || !Array.isArray(panelIds) || panelIds.length === 0) {
      return NextResponse.json(
        { error: "请选择要修改的分镜" },
        { status: 400 }
      );
    }

    if (panelIds.length > 50) {
      return NextResponse.json(
        { error: "一次最多修改50个分镜" },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "请提供要更新的字段" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: PanelUpdateData = {};
    const allowedFields = [
      "panel_type",
      "importance",
      "camera_angle",
      "shot_size",
      // Phase 2: Asset binding fields
      "character_id",
      "expression_type",
      "outfit_id",
      "scene_id",
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined && updates[field] !== null && updates[field] !== "") {
        updateData[field as keyof PanelUpdateData] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "没有有效的更新字段" },
        { status: 400 }
      );
    }

    // Validate field values
    if (updateData.panel_type) {
      const validTypes = ["wide", "medium", "closeup", "action", "dialogue", "transition"];
      if (!validTypes.includes(updateData.panel_type)) {
        return NextResponse.json(
          { error: "无效的分镜类型" },
          { status: 400 }
        );
      }
    }

    if (updateData.importance) {
      const validImportance = ["high", "medium", "low"];
      if (!validImportance.includes(updateData.importance)) {
        return NextResponse.json(
          { error: "无效的重要性级别" },
          { status: 400 }
        );
      }
    }

    if (updateData.camera_angle) {
      const validAngles = ["俯视", "仰视", "平视", "荷兰角"];
      if (!validAngles.includes(updateData.camera_angle)) {
        return NextResponse.json(
          { error: "无效的镜头角度" },
          { status: 400 }
        );
      }
    }

    if (updateData.shot_size) {
      const validSizes = ["特写", "近景", "中景", "全景", "远景"];
      if (!validSizes.includes(updateData.shot_size)) {
        return NextResponse.json(
          { error: "无效的景别" },
          { status: 400 }
        );
      }
    }

    // Get panels and verify ownership
    const panels = await prisma.panel.findMany({
      where: {
        id: { in: panelIds }
      },
      include: {
        project: {
          select: {
            id: true,
            user_id: true
          }
        }
      }
    });

    if (panels.length === 0) {
      return NextResponse.json(
        { error: "未找到要修改的分镜" },
        { status: 404 }
      );
    }

    // Verify all panels belong to the same project
    const projectIds = [...new Set(panels.map(p => p.project_id))];
    if (projectIds.length > 1) {
      return NextResponse.json(
        { error: "只能批量修改同一项目的分镜" },
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

    // Update panels
    await prisma.panel.updateMany({
      where: {
        id: { in: panelIds }
      },
      data: updateData
    });

    // Get updated panels for response
    const updatedPanels = await prisma.panel.findMany({
      where: {
        id: { in: panelIds }
      },
      orderBy: { panel_order: "asc" }
    });

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: updatedPanels.length,
        panels: updatedPanels,
        appliedUpdates: updateData
      },
      message: `成功修改 ${updatedPanels.length} 个分镜`
    });
  } catch (error) {
    console.error("Batch update panels error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `批量修改失败: ${message}` }, { status: 500 });
  }
}
