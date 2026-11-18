import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";

/**
 * GET /api/chapter/[id]
 * 获取章节详情（包含分镜）
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;
  let chapterId = "";

  try {
    const params = await context.params;
    chapterId = params.id;

    logInfo("Request received", { endpoint: `/api/chapter/${chapterId}`, method: "GET" });

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }
    userId = payload.userId;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        // story 仅为响应兼容保留，独立项目的章节为 null
        story: {
          select: { user_id: true },
        },
        project: {
          select: { user_id: true },
        },
        panels: {
          orderBy: { panel_order: "asc" },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.project.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    logInfo("Chapter loaded", {
      endpoint: `/api/chapter/${chapterId}`,
      userId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ success: true, chapter });
  } catch (error) {
    logError("Get chapter failed", error, {
      endpoint: chapterId ? `/api/chapter/${chapterId}` : "/api/chapter/[id]",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "获取章节详情失败",
      },
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
  const startedAt = Date.now();
  let userId: string | null = null;
  let chapterId = "";

  try {
    const params = await context.params;
    chapterId = params.id;

    logInfo("Request received", { endpoint: `/api/chapter/${chapterId}`, method: "PATCH" });

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }
    userId = payload.userId;

    const body = await request.json();
    const { title, summary } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "章节标题不能为空" }, { status: 400 });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        project: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.project.user_id !== userId) {
      return NextResponse.json({ error: "无权修改此章节" }, { status: 403 });
    }

    const updatedChapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        title: title.trim(),
        summary: summary ? summary.trim() : null,
        updated_at: new Date(),
      },
    });

    logInfo("Chapter updated", {
      endpoint: `/api/chapter/${chapterId}`,
      userId,
      chapterId,
      title: updatedChapter.title,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      chapter: updatedChapter,
      message: "章节已更新",
    });
  } catch (error) {
    logError("Update chapter failed", error, {
      endpoint: chapterId ? `/api/chapter/${chapterId}` : "/api/chapter/[id]",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "更新章节失败",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chapter/[id]
 * 删除章节（级联删除分镜）
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  let userId: string | null = null;
  let chapterId = "";

  try {
    const params = await context.params;
    chapterId = params.id;

    logInfo("Request received", { endpoint: `/api/chapter/${chapterId}`, method: "DELETE" });

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }
    userId = payload.userId;

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        project: {
          select: { user_id: true },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.project.user_id !== userId) {
      return NextResponse.json({ error: "无权删除此章节" }, { status: 403 });
    }

    await prisma.chapter.delete({ where: { id: chapterId } });

    logInfo("Chapter deleted", {
      endpoint: `/api/chapter/${chapterId}`,
      userId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ success: true, message: "章节已删除" });
  } catch (error) {
    logError("Delete chapter failed", error, {
      endpoint: chapterId ? `/api/chapter/${chapterId}` : "/api/chapter/[id]",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "删除章节失败",
      },
      { status: 500 }
    );
  }
}
