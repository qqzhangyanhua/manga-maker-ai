/**
 * 角色身份证列表 API
 * GET /api/canvas/character/[characterId]/prompts - 获取角色的所有身份证 Prompt 模板
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ characterId: string }>;
}

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

  const { characterId } = await params;

  try {
    // 获取该角色的所有 Prompt 模板
    const templates = await prisma.characterPromptTemplate.findMany({
      where: {
        character_id: characterId,
        user_id: payload.userId,
      },
      orderBy: [
        { version: "asc" }, // base 在前
        { variant_name: "asc" }, // 变体按名称排序
        { created_at: "asc" },
      ],
    });

    // 尝试获取角色信息（用于显示）
    let characterInfo: {
      id: string;
      name: string;
      description: string | null;
      image_url: string | null;
    } | null = null;

    // 首先尝试从 NovelProject.characters JSON 字段查找
    const novelProjects = await prisma.novelProject.findMany({
      where: {
        user_id: payload.userId,
      },
      select: {
        characters: true,
      },
    });

    for (const project of novelProjects) {
      if (project.characters && Array.isArray(project.characters)) {
        const found = (project.characters as Array<{
          id?: string;
          name: string;
          description?: string;
          image_url?: string;
        }>).find((c) => c.id === characterId);
        if (found) {
          characterInfo = {
            id: characterId,
            name: found.name,
            description: found.description || null,
            image_url: found.image_url || null,
          };
          break;
        }
      }
    }

    // 如果没找到，尝试从 Character 表查找
    if (!characterInfo) {
      const character = await prisma.character.findFirst({
        where: {
          id: characterId,
          user_id: payload.userId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          base_image_url: true,
        },
      });

      if (character) {
        characterInfo = {
          id: character.id,
          name: character.name,
          description: character.description,
          image_url: character.base_image_url,
        };
      }
    }

    return NextResponse.json({
      success: true,
      prompts: templates.map((t) => ({
        ...t,
        created_at: t.created_at.toISOString(),
        updated_at: t.updated_at.toISOString(),
      })),
      character: characterInfo,
    });
  } catch (error) {
    console.error("获取角色身份证列表失败:", error);
    return NextResponse.json(
      { error: "获取角色身份证列表失败" },
      { status: 500 }
    );
  }
}
