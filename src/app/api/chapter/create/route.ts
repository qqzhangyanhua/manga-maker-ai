import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import { ensureStoryProject } from "@/lib/project";

/**
 * POST /api/chapter/create
 * 手动创建单个章节（用于连载模式）
 */
export async function POST(request: Request) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    logInfo("Request received", { endpoint: "/api/chapter/create", method: "POST" });

    // 1. 验证权限
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

    logInfo("User authenticated", { endpoint: "/api/chapter/create", userId });

    // 2. 解析请求体
    const body = await request.json();
    const { story_id, title, summary, content } = body;

    if (!story_id || !title) {
      return NextResponse.json(
        { error: "缺少必需参数: story_id, title" },
        { status: 400 }
      );
    }

    logInfo("Request validated", {
      endpoint: "/api/chapter/create",
      userId,
      story_id,
      title,
    });

    // 3. 验证故事所有权
    const story = await prisma.story.findUnique({
      where: { id: story_id },
      select: { user_id: true, is_serialized: true },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 4. 获取当前最大章节序号
    const lastChapter = await prisma.chapter.findFirst({
      where: { story_id },
      orderBy: { chapter_order: "desc" },
      select: { chapter_order: true },
    });

    const nextOrder = (lastChapter?.chapter_order || 0) + 1;

    logInfo("Creating chapter", {
      endpoint: "/api/chapter/create",
      userId,
      story_id,
      chapter_order: nextOrder,
    });

    // 5. 创建章节（挂在故事主项目上）
    const project = await ensureStoryProject(prisma, story_id);
    const chapter = await prisma.chapter.create({
      data: {
        story_id,
        project_id: project.id,
        title,
        summary: summary || "",
        content: content || null,
        chapter_order: nextOrder,
        publish_status: "draft", // 默认草稿状态
        published_at: null,
      },
    });

    logInfo("Chapter created", {
      endpoint: "/api/chapter/create",
      userId,
      chapter_id: chapter.id,
      chapter_order: chapter.chapter_order,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      chapter,
      message: `成功创建章节：${title}`,
    });
  } catch (error) {
    logError("Chapter creation failed", error, {
      endpoint: "/api/chapter/create",
      userId: userId || "unknown",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "创建章节失败",
      },
      { status: 500 }
    );
  }
}
