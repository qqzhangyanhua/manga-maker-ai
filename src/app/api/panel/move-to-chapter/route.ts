/**
 * Panel Move to Chapter API
 * POST /api/panel/move-to-chapter - 将分镜移动到另一个章节
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";
import { assertChapterInProject } from "@/lib/project";
import { panels } from "@/lib/project/chapter-panels";
import { parsePlaceAnchor } from "../place-anchor";

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

    const raw: unknown = await req.json();
    const body = asRecord(raw);
    if (!body) {
      return NextResponse.json({ error: "请求体无效" }, { status: 400 });
    }

    const panelId = body.panel_id;
    const targetChapterId = body.target_chapter_id;
    if (
      typeof panelId !== "string" ||
      panelId.length === 0 ||
      typeof targetChapterId !== "string" ||
      targetChapterId.length === 0
    ) {
      return NextResponse.json({ error: "缺少必需参数" }, { status: 400 });
    }

    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        project: { select: { user_id: true } },
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    // 章节归属在 place 之前校验，失败时不会开写事务
    await assertChapterInProject(prisma, targetChapterId, panel.project_id);

    if (panel.chapter_id === targetChapterId) {
      return NextResponse.json({
        success: true,
        message: "分镜已在目标章节中",
      });
    }

    const anchorInput: Record<string, unknown> = {};
    if (body.before !== undefined) anchorInput.before = body.before;
    if (body.after !== undefined) anchorInput.after = body.after;
    if (body.before === undefined && body.after === undefined) {
      anchorInput.chapter_id = targetChapterId;
    }
    if (body.index !== undefined) anchorInput.index = body.index;

    const parsed = parsePlaceAnchor(anchorInput);
    if (parsed.ok === false) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if ("before" in parsed.anchor || "after" in parsed.anchor) {
      const anchorId = "before" in parsed.anchor ? parsed.anchor.before : parsed.anchor.after;
      const anchorPanel = await prisma.panel.findUnique({
        where: { id: anchorId },
        select: { id: true, chapter_id: true, project_id: true },
      });
      if (
        !anchorPanel ||
        anchorPanel.chapter_id !== targetChapterId ||
        anchorPanel.project_id !== panel.project_id
      ) {
        return NextResponse.json(
          { error: "锚点分镜不存在或不在目标章节" },
          { status: 400 },
        );
      }
    }

    const placed = await panels(panel.project_id).place([panelId], parsed.anchor);
    const moved = placed.find((item) => item.id === panelId);
    if (!moved) {
      return NextResponse.json({ error: "移动分镜失败" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "分镜已移动",
      data: {
        panel_id: panelId,
        target_chapter_id: targetChapterId,
        new_order: moved.panelOrder,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    console.error("Panel move error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "移动失败" },
      { status: 500 },
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
