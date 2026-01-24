/**
 * Novel Chapter Characters API
 * GET /api/novel/chapter/[chapterId]/characters - 获取小说章节关联的角色列表
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { chapterId: string } }
) {
  try {
    // 1. 身份验证
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { chapterId } = params;

    // 2. 查询章节信息
    const chapter = await prisma.novelChapter.findUnique({
      where: { id: chapterId },
      include: {
        novel_project: true,
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }

    // 3. 权限检查
    if (chapter.novel_project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 4. 查询项目关联的所有角色
    // 注意: 目前数据库中没有章节-角色关联表,所以返回项目级别的角色
    const characters = await prisma.novelCharacter.findMany({
      where: {
        novel_project_id: chapter.novel_project_id,
      },
      select: {
        id: true,
        name: true,
        role: true,
        avatar_url: true,
        reference_image_url: true,
      },
      orderBy: {
        created_at: "asc",
      },
    });

    return NextResponse.json({
      characters: characters.map((char) => ({
        id: char.id,
        name: char.name,
        role: char.role || undefined,
        avatar_url: char.avatar_url || undefined,
        reference_image_url: char.reference_image_url || undefined,
      })),
    });
  } catch (error) {
    console.error("获取章节角色失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
