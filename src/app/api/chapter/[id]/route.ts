import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/chapter/[id]
 * 获取章节详情（包含分镜）
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: chapterId } = await context.params;

    // 获取章节及其关联的故事
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: { user_id: true }
        },
        panels: {
          orderBy: { panel_order: "asc" }
        }
      }
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    // 验证所有权
    if (chapter.story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    return NextResponse.json({ chapter });
  } catch (error) {
    console.error("获取章节详情失败:", error);
    return NextResponse.json(
      { error: "获取章节详情失败" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chapter/[id]
 * 更新章节信息
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: chapterId } = await context.params;
    const body = await request.json();
    const { title, summary, chapter_order } = body;

    // 获取章节及其关联的故事
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: { user_id: true }
        }
      }
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    // 验证所有权
    if (chapter.story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    // 构建更新数据
    const updateData: {
      title?: string;
      summary?: string | null;
      chapter_order?: number;
    } = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        return NextResponse.json({ error: "章节标题不能为空" }, { status: 400 });
      }
      updateData.title = title;
    }

    if (summary !== undefined) {
      updateData.summary = summary || null;
    }

    if (chapter_order !== undefined) {
      if (typeof chapter_order !== "number" || chapter_order < 1) {
        return NextResponse.json({ error: "章节顺序必须是正整数" }, { status: 400 });
      }
      updateData.chapter_order = chapter_order;
    }

    // 更新章节
    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: updateData
    });

    return NextResponse.json({ chapter: updatedChapter });
  } catch (error) {
    console.error("更新章节失败:", error);
    return NextResponse.json(
      { error: "更新章节失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chapter/[id]
 * 删除章节（同时删除关联的分镜）
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: chapterId } = await context.params;

    // 获取章节及其关联的故事
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: { user_id: true }
        }
      }
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    // 验证所有权
    if (chapter.story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    // 删除章节（级联删除分镜）
    await prisma.chapter.delete({
      where: { id: chapterId }
    });

    return NextResponse.json({ message: "章节已删除" });
  } catch (error) {
    console.error("删除章节失败:", error);
    return NextResponse.json(
      { error: "删除章节失败" },
      { status: 500 }
    );
  }
}
