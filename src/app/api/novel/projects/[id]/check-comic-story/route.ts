/**
 * Check if novel has been converted to comic
 * GET /api/novel/projects/[id]/check-comic-story
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // 验证认证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const userId = payload.userId;

    // 查找是否存在关联到此小说的 Story
    const story = await prisma.story.findFirst({
      where: {
        source_novel_id: projectId,
        user_id: userId,
      },
      select: {
        id: true,
        title: true,
        created_at: true,
        _count: {
          select: {
            chapters: true,
          },
        },
      },
    });

    if (story) {
      return NextResponse.json({
        exists: true,
        story_id: story.id,
        story_title: story.title,
        chapters_count: story._count.chapters,
        created_at: story.created_at,
      });
    }

    return NextResponse.json({
      exists: false,
    });
  } catch (error) {
    console.error("检测漫画项目失败:", error);
    return NextResponse.json(
      { error: "检测失败，请稍后重试" },
      { status: 500 }
    );
  }
}
