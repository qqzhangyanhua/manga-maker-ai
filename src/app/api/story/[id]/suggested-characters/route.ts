/**
 * PATCH /api/story/[id]/suggested-characters
 * 更新或删除建议角色
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SuggestedCharacter, SuggestedCharactersData } from "@/types/suggested-characters.types";

interface UpdateRequestBody {
  temp_id: string;
  action: "update" | "delete";
  updates?: Partial<SuggestedCharacter>;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;

    // 认证检查
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

    // 获取故事
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 解析请求
    const body = (await req.json()) as UpdateRequestBody;
    const { temp_id, action, updates } = body;

    if (!temp_id || !action) {
      return NextResponse.json({ error: "缺少必需参数" }, { status: 400 });
    }

    // 获取建议角色数据
    if (!story.suggested_characters) {
      return NextResponse.json({ error: "故事没有建议角色" }, { status: 400 });
    }

    const suggestedData = story.suggested_characters as unknown as SuggestedCharactersData;
    const characterIndex = suggestedData.characters.findIndex((char) => char.temp_id === temp_id);

    if (characterIndex === -1) {
      return NextResponse.json({ error: "无效的 temp_id" }, { status: 404 });
    }

    let updatedCharacters: SuggestedCharacter[];

    if (action === "delete") {
      // 删除角色
      updatedCharacters = suggestedData.characters.filter((char) => char.temp_id !== temp_id);
      console.log(`[suggested-characters] Deleted character ${temp_id}`);
    } else if (action === "update") {
      // 更新角色
      if (!updates) {
        return NextResponse.json({ error: "更新操作需要提供 updates 参数" }, { status: 400 });
      }

      updatedCharacters = suggestedData.characters.map((char) => {
        if (char.temp_id === temp_id) {
          return { ...char, ...updates, temp_id }; // 保持 temp_id 不变
        }
        return char;
      });
      console.log(`[suggested-characters] Updated character ${temp_id}`);
    } else {
      return NextResponse.json({ error: "无效的 action 参数" }, { status: 400 });
    }

    // 更新数据库
    const updatedData: SuggestedCharactersData = {
      ...suggestedData,
      characters: updatedCharacters,
    };

    await prisma.story.update({
      where: { id: storyId },
      data: {
        suggested_characters: updatedData as any,
      },
    });

    return NextResponse.json({
      success: true,
      action,
      temp_id,
      characters_count: updatedCharacters.length,
    });
  } catch (error) {
    console.error("[suggested-characters] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/story/[id]/suggested-characters
 * 获取建议角色列表
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;

    // 认证检查
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

    // 获取故事
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        id: true,
        user_id: true,
        suggested_characters: true,
      },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 返回建议角色数据
    if (!story.suggested_characters) {
      return NextResponse.json({
        success: true,
        suggested_characters: null,
        message: "故事还没有建议角色，请先运行角色分析",
      });
    }

    const suggestedData = story.suggested_characters as unknown as SuggestedCharactersData;

    return NextResponse.json({
      success: true,
      suggested_characters: suggestedData.characters,
      metadata: {
        version: suggestedData.version,
        generated_at: suggestedData.generated_at,
        comic_style_id: suggestedData.comic_style_id,
        settings: suggestedData.settings,
      },
    });
  } catch (error) {
    console.error("[suggested-characters] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取失败" },
      { status: 500 }
    );
  }
}
