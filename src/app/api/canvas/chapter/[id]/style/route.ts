/**
 * Canvas Chapter Style API
 * PATCH /api/canvas/chapter/[id]/style - 更新章节的漫画风格
 * GET /api/canvas/chapter/[id]/style - 获取章节当前的漫画风格
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateStyleSchema = z.object({
  comic_style_id: z.string().uuid().nullable(),
});

/**
 * GET /api/canvas/chapter/[id]/style - 获取章节当前风格
 */
export async function GET(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id: chapterId } = await params;

  try {
    const chapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      include: {
        timeline: { select: { user_id: true } },
        comic_style: {
          select: {
            id: true,
            style_key: true,
            name_zh: true,
            name_en: true,
            image_url: true,
            tag_color: true,
            prompt_prefix: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    return NextResponse.json({
      comic_style_id: chapter.comic_style_id,
      comic_style: chapter.comic_style,
    });
  } catch (error) {
    console.error("[GET /api/canvas/chapter/[id]/style]", error);
    return NextResponse.json(
      { error: "获取风格失败" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/canvas/chapter/[id]/style - 更新章节风格
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id: chapterId } = await params;

  try {
    const body = await req.json();
    const validated = updateStyleSchema.parse(body);

    // 验证章节存在且属于当前用户
    const chapter = await prisma.timelineChapter.findUnique({
      where: { id: chapterId },
      include: {
        timeline: { select: { user_id: true } },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.timeline.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    // 如果指定了风格 ID，验证风格存在且已启用
    if (validated.comic_style_id) {
      const style = await prisma.comicStyle.findUnique({
        where: { id: validated.comic_style_id },
      });

      if (!style) {
        return NextResponse.json({ error: "风格不存在" }, { status: 404 });
      }

      if (!style.enabled) {
        return NextResponse.json({ error: "该风格已禁用" }, { status: 400 });
      }
    }

    // 更新章节风格
    const updated = await prisma.timelineChapter.update({
      where: { id: chapterId },
      data: {
        comic_style_id: validated.comic_style_id,
        updated_at: new Date(),
      },
      include: {
        comic_style: {
          select: {
            id: true,
            style_key: true,
            name_zh: true,
            name_en: true,
            image_url: true,
            tag_color: true,
            prompt_prefix: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      comic_style_id: updated.comic_style_id,
      comic_style: updated.comic_style,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "数据验证失败", details: error.errors },
        { status: 400 }
      );
    }

    console.error("[PATCH /api/canvas/chapter/[id]/style]", error);
    return NextResponse.json(
      { error: "更新风格失败" },
      { status: 500 }
    );
  }
}
