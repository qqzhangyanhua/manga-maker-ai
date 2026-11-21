/**
 * Panel Batch Reorder API
 *
 * PUT /api/panel/batch-reorder - 按锚点批量移动分镜，顺序跟请求里的 panel_ids
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { panels } from "@/lib/project/chapter-panels";
import { parsePlaceAnchor } from "../place-anchor";

export const dynamic = "force-dynamic";

/**
 * PUT /api/panel/batch-reorder
 *
 * Body:
 * - panel_ids: string[]（按希望落下的顺序）
 * - project_id: string
 * - before / after / chapter_id + 可选 index，恰好一种
 */
export async function PUT(req: Request) {
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

    const raw: unknown = await req.json();
    const body = asRecord(raw);
    if (!body) {
      return NextResponse.json({ error: "请求体无效" }, { status: 400 });
    }

    const panelIds = readPanelIds(body.panel_ids);
    if (!panelIds) {
      return NextResponse.json(
        { error: "缺少必需参数：panel_ids" },
        { status: 400 },
      );
    }

    if (typeof body.project_id !== "string" || body.project_id.length === 0) {
      return NextResponse.json(
        { error: "缺少必需参数：project_id" },
        { status: 400 },
      );
    }
    const projectId = body.project_id;

    const parsed = parsePlaceAnchor(body);
    if (parsed.ok === false) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const panelsToMove = await prisma.panel.findMany({
      where: {
        id: { in: panelIds },
        project_id: projectId,
      },
      include: {
        project: {
          select: { user_id: true },
        },
      },
    });

    if (panelsToMove.length !== panelIds.length) {
      return NextResponse.json(
        { error: "部分分镜不存在或不属于指定项目" },
        { status: 404 },
      );
    }

    if (panelsToMove.some((panel) => panel.project.user_id !== payload.userId)) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    const placed = await panels(projectId).place(panelIds, parsed.anchor);

    return NextResponse.json({
      success: true,
      message: `成功移动 ${panelIds.length} 个分镜`,
      placed,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    console.error("Batch reorder panels error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readPanelIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids: string[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== "string" || item.length === 0) return null;
    ids.push(item);
  }
  return ids;
}
