/**
 * Chapter Reorder API
 * PUT /api/chapter/reorder - 批量更新章节顺序
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface ReorderRequest {
  story_id: string;
  chapter_orders: Array<{ id: string; chapter_order: number }>;
}

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

    const body: ReorderRequest = await req.json();
    const { story_id, chapter_orders } = body;

    if (!story_id) {
      return NextResponse.json({ error: "缺少 story_id" }, { status: 400 });
    }

    if (!chapter_orders || !Array.isArray(chapter_orders) || chapter_orders.length === 0) {
      return NextResponse.json({ error: "缺少 chapter_orders" }, { status: 400 });
    }

    // 验证故事所有权
    const story = await prisma.story.findUnique({
      where: { id: story_id },
      select: { user_id: true },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限操作" }, { status: 403 });
    }

    // 验证所有章节属于该故事
    const chapterIds = chapter_orders.map((c) => c.id);
    const chapters = await prisma.chapter.findMany({
      where: {
        id: { in: chapterIds },
        story_id,
      },
      select: { id: true },
    });

    if (chapters.length !== chapterIds.length) {
      return NextResponse.json(
        { error: "部分章节不存在或不属于该故事" },
        { status: 400 }
      );
    }

    // 使用事务批量更新
    await prisma.$transaction(
      chapter_orders.map((item) =>
        prisma.chapter.update({
          where: { id: item.id },
          data: { chapter_order: item.chapter_order },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: "章节顺序已更新",
    });
  } catch (error) {
    console.error("Chapter reorder error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 }
    );
  }
}
