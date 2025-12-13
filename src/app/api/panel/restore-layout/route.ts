/**
 * Panel Restore Layout API
 *
 * POST /api/panel/restore-layout - Restore previous layout_hint values (for undo)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RestoreLayoutRequest {
  hints: { id: string; hint: string | null }[];
}

/**
 * POST /api/panel/restore-layout
 *
 * Restore previous layout_hint values for undo functionality
 *
 * Body:
 * - hints: Array of { id: string, hint: string | null }
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
    const body: RestoreLayoutRequest = await req.json();
    const { hints } = body;

    // Validate hints
    if (!hints || !Array.isArray(hints) || hints.length === 0) {
      return NextResponse.json(
        { error: "请提供要恢复的布局信息" },
        { status: 400 }
      );
    }

    const panelIds = hints.map((h) => h.id);

    // Verify all panels exist and belong to user's project
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
    });

    if (panels.length !== panelIds.length) {
      return NextResponse.json(
        { error: "部分分镜不存在" },
        { status: 404 }
      );
    }

    // Verify all panels belong to user's projects
    const unauthorizedPanels = panels.filter(
      (p) => p.project.user_id !== payload.userId
    );
    if (unauthorizedPanels.length > 0) {
      return NextResponse.json(
        { error: "无权限操作部分分镜" },
        { status: 403 }
      );
    }

    // Restore layout hints in a transaction
    await prisma.$transaction(
      hints.map((h) =>
        prisma.panel.update({
          where: { id: h.id },
          data: { layout_hint: h.hint },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `已恢复 ${hints.length} 个分镜的布局状态`,
    });
  } catch (error) {
    console.error("Restore layout error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `恢复布局失败: ${message}` },
      { status: 500 }
    );
  }
}
