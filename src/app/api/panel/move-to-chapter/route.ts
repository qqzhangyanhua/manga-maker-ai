/**
 * Panel Move to Chapter API
 * POST /api/panel/move-to-chapter - 将分镜移动到另一个章节
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface MoveRequest {
  panel_id: string;
  target_chapter_id: string;
  target_order?: number; // 可选，不提供则追加到末尾
}

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

    const body: MoveRequest = await req.json();
    const { panel_id, target_chapter_id, target_order } = body;

    if (!panel_id || !target_chapter_id) {
      return NextResponse.json(
        { error: "缺少必需参数" },
        { status: 400 }
      );
    }

    // 获取分镜及其项目信息
    const panel = await prisma.panel.findUnique({
      where: { id: panel_id },
      include: {
        project: { select: { user_id: true } },
        chapter: { select: { story_id: true } },
      },
    });

    if (!panel) {
      return NextResponse.json({ error: "分镜不存在" }, { status: 404 });
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    // 验证目标章节
    const targetChapter = await prisma.chapter.findUnique({
      where: { id: target_chapter_id },
      include: {
        story: { select: { user_id: true } },
      },
    });

    if (!targetChapter) {
      return NextResponse.json({ error: "目标章节不存在" }, { status: 404 });
    }

    if (targetChapter.story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作目标章节" }, { status: 403 });
    }

    // 如果分镜已在目标章节，直接返回
    if (panel.chapter_id === target_chapter_id) {
      return NextResponse.json({
        success: true,
        message: "分镜已在目标章节中",
      });
    }

    const sourceChapterId = panel.chapter_id;
    const sourceOrder = panel.panel_order;

    // 获取目标章节的最大 panel_order
    const maxOrderResult = await prisma.panel.aggregate({
      where: { chapter_id: target_chapter_id },
      _max: { panel_order: true },
    });
    const maxOrder = maxOrderResult._max.panel_order || 0;
    const finalTargetOrder = target_order ?? maxOrder + 1;

    await prisma.$transaction(async (tx) => {
      // 1. 如果有源章节，更新源章节中后续分镜的顺序
      if (sourceChapterId) {
        await tx.panel.updateMany({
          where: {
            chapter_id: sourceChapterId,
            panel_order: { gt: sourceOrder },
          },
          data: { panel_order: { decrement: 1 } },
        });
      }

      // 2. 如果插入到中间位置，更新目标章节中后续分镜的顺序
      if (target_order !== undefined) {
        await tx.panel.updateMany({
          where: {
            chapter_id: target_chapter_id,
            panel_order: { gte: finalTargetOrder },
          },
          data: { panel_order: { increment: 1 } },
        });
      }

      // 3. 移动分镜到目标章节
      await tx.panel.update({
        where: { id: panel_id },
        data: {
          chapter_id: target_chapter_id,
          panel_order: finalTargetOrder,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "分镜已移动",
      data: {
        panel_id,
        target_chapter_id,
        new_order: finalTargetOrder,
      },
    });
  } catch (error) {
    console.error("Panel move error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "移动失败" },
      { status: 500 }
    );
  }
}
