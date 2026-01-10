import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/chapter/[id]/panels
 * 获取章节的所有分镜
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

    // 获取章节及验证权限
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        story: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    if (chapter.story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此章节" }, { status: 403 });
    }

    // 获取该章节的所有分镜
    const panels = await prisma.panel.findMany({
      where: {
        chapter_id: chapterId,
      },
      orderBy: {
        panel_order: "asc",
      },
      select: {
        id: true,
        panel_order: true,
        description: true,
        visual_prompt: true,
        generated_image: true,
        camera_angle: true,
        shot_size: true,
      },
    });

    return NextResponse.json({
      success: true,
      panels,
      total: panels.length,
    });
  } catch (error) {
    console.error("获取章节分镜失败:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
