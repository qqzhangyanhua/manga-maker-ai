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

    // 2. 尝试查询章节信息（支持 NovelChapter 系统）
    // 注意：Timeline 系统的章节可能不在 NovelChapter 表中
    const chapter = await prisma.novelChapter.findUnique({
      where: { id: chapterId },
      include: {
        project: true,
      },
    });

    // 3. 权限检查
    // 如果找到章节，验证所属项目的用户权限
    if (chapter && chapter.project.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 4. 查询用户的所有角色（Comic Character 表）
    // Novel 系统复用 Comic 的 Character 表
    // Timeline 系统调用时直接返回用户角色（章节验证已在前端完成）
    const characters = await prisma.character.findMany({
      where: {
        user_id: payload.userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        base_image_url: true,
        reference_image: true,
      },
      orderBy: {
        created_at: "asc",
      },
      take: 20, // 限制返回数量
    });

    return NextResponse.json({
      characters: characters.map((char) => ({
        id: char.id,
        name: char.name,
        role: char.description || undefined, // 使用 description 作为 role
        avatar_url: char.base_image_url || undefined,
        reference_image_url: char.reference_image || undefined,
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
