/**
 * Panel Batch Delete API
 *
 * POST /api/panel/batch-delete - Delete multiple panels
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/panel/batch-delete
 *
 * Delete multiple panels and reorder remaining panels
 *
 * Body:
 * - panelIds: string[] (required, 1-50 panel IDs)
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
    const { panelIds } = body;

    // Validate input
    if (!panelIds || !Array.isArray(panelIds) || panelIds.length === 0) {
      return NextResponse.json(
        { error: "请选择要删除的分镜" },
        { status: 400 }
      );
    }

    if (panelIds.length > 50) {
      return NextResponse.json(
        { error: "一次最多删除50个分镜" },
        { status: 400 }
      );
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
      },
      orderBy: { panel_order: "asc" }
    });

    if (panels.length === 0) {
      return NextResponse.json(
        { error: "未找到要删除的分镜" },
        { status: 404 }
      );
    }

    // Verify all panels belong to the same project
    const projectIds = [...new Set(panels.map(p => p.project_id))];
    if (projectIds.length > 1) {
      return NextResponse.json(
        { error: "只能批量删除同一项目的分镜" },
        { status: 400 }
      );
    }

    const projectId = projectIds[0];
    const project = panels[0].project;

    // Verify user owns the project
    if (project.user_id !== payload.userId) {
      return NextResponse.json(
        { error: "无权限操作该项目" },
        { status: 403 }
      );
    }

    // Delete panels and reorder remaining panels in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete selected panels
      await tx.panel.deleteMany({
        where: {
          id: { in: panelIds }
        }
      });

      // Get remaining panels
      const remainingPanels = await tx.panel.findMany({
        where: { project_id: projectId },
        orderBy: { panel_order: "asc" },
        select: { id: true, panel_order: true }
      });

      // Reorder remaining panels
      const updates = remainingPanels.map((panel, index) => {
        return tx.panel.update({
          where: { id: panel.id },
          data: { panel_order: index + 1 }
        });
      });

      await Promise.all(updates);

      return {
        deletedCount: panels.length,
        remainingCount: remainingPanels.length
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `成功删除 ${result.deletedCount} 个分镜`
    });
  } catch (error) {
    console.error("Batch delete panels error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `批量删除失败: ${message}` }, { status: 500 });
  }
}
