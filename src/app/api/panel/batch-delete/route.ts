/**
 * Panel Batch Delete API
 *
 * POST /api/panel/batch-delete - 批量删除分镜
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { panels } from "@/lib/project/chapter-panels";

export const dynamic = "force-dynamic";

const NOT_FOUND_MESSAGE = "未找到要删除的分镜";

/**
 * POST /api/panel/batch-delete
 *
 * 删除多个分镜。章节内顺序由模块维护，这里不再按项目重排。
 *
 * Body:
 * - panelIds: string[] (required, 1-50 panel IDs)
 */
export async function POST(req: Request) {
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

    const body = await req.json();
    const { panelIds } = body;

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

    const found = await prisma.panel.findMany({
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

    if (found.length === 0) {
      return NextResponse.json(
        { error: NOT_FOUND_MESSAGE },
        { status: 404 }
      );
    }

    const projectIds = [...new Set(found.map((panel) => panel.project_id))];
    if (projectIds.length > 1) {
      return NextResponse.json(
        { error: "只能批量删除同一项目的分镜" },
        { status: 400 }
      );
    }

    const projectId = projectIds[0];
    const project = found[0]?.project;
    if (!projectId || !project) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json(
        { error: "无权限操作该项目" },
        { status: 403 }
      );
    }

    // 有缺失 id 就整次不删，避免删到一半再发现对不上
    if (found.length !== panelIds.length) {
      return NextResponse.json(
        { error: NOT_FOUND_MESSAGE },
        { status: 404 }
      );
    }

    const removedIds = found.map((panel) => panel.id);
    const discarded = await panels(projectId).remove(removedIds);
    const remainingCount = await prisma.panel.count({
      where: { project_id: projectId },
    });
    const deletedCount = removedIds.length;

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        remainingCount,
        discarded,
      },
      message: `成功删除 ${deletedCount} 个分镜`,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    console.error("Batch delete panels error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `批量删除失败: ${message}` }, { status: 500 });
  }
}
