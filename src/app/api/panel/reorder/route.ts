import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { panels } from "@/lib/project/chapter-panels";
import { parsePlaceAnchor } from "../place-anchor";

/**
 * PUT /api/panel/reorder - 按锚点重排一个分镜
 *
 * 请求体：panel_id、project_id，以及恰好一种锚点
 * （before、after，或 chapter_id + 可选 index，index 从 0 起）。
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

    const panelId = body.panel_id;
    const projectId = body.project_id;
    if (
      typeof panelId !== "string" ||
      panelId.length === 0 ||
      typeof projectId !== "string" ||
      projectId.length === 0
    ) {
      return NextResponse.json(
        { error: "缺少必需参数：panel_id、project_id" },
        { status: 400 },
      );
    }

    const parsed = parsePlaceAnchor(body);
    if (parsed.ok === false) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existingPanel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: { project: { select: { user_id: true } } },
    });

    if (!existingPanel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (existingPanel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作此分镜" }, { status: 403 });
    }

    if (existingPanel.project_id !== projectId) {
      return NextResponse.json({ error: "分镜不属于指定项目" }, { status: 400 });
    }

    await panels(projectId).place([panelId], parsed.anchor);

    const updatedPanel = await prisma.panel.findUnique({
      where: { id: panelId },
    });

    return NextResponse.json({
      success: true,
      panel: updatedPanel,
      message: "分镜顺序已更新",
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    console.error("Reorder panel error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
