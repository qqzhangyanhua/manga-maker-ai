/**
 * GET /api/story/[id]/suggested-characters
 * 获取建议角色列表
 *
 * PATCH /api/story/[id]/suggested-characters
 * 更新或删除建议角色
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { CharacterRole } from "@/components/StoryCharacter/types";

interface UpdateRequestBody {
  id: string; // SuggestedCharacter ID (not temp_id)
  action: "update" | "delete";
  updates?: {
    name?: string;
    description?: string;
    appearance?: string;
    role?: CharacterRole;
  };
}

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
        suggested_characters_list: {
          orderBy: { display_order: "asc" },
          include: {
            character: {
              select: {
                id: true,
                name: true,
                base_image_url: true,
              },
            },
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 返回建议角色数据
    if (story.suggested_characters_list.length === 0) {
      return NextResponse.json({
        success: true,
        suggested_characters: [],
        message: "故事还没有建议角色，请先运行角色分析",
      });
    }

    return NextResponse.json({
      success: true,
      suggested_characters: story.suggested_characters_list.map((char) => ({
        id: char.id,
        name: char.name,
        description: char.description,
        appearance: char.appearance,
        role: char.role,
        generated: char.generated,
        character_id: char.character_id,
        image_url: char.image_url,
        optimized_prompt: char.optimized_prompt,
        generated_at: char.generated_at,
        character: char.character,
      })),
    });
  } catch (error) {
    console.error("[suggested-characters] GET Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取失败" },
      { status: 500 }
    );
  }
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
      select: { id: true, user_id: true },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // 解析请求
    const body = (await req.json()) as UpdateRequestBody;
    const { id, action, updates } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "缺少必需参数" }, { status: 400 });
    }

    // 验证该建议角色属于当前故事
    const suggestedChar = await prisma.suggestedCharacter.findUnique({
      where: { id },
    });

    if (!suggestedChar) {
      return NextResponse.json({ error: "建议角色不存在" }, { status: 404 });
    }

    if (suggestedChar.story_id !== storyId) {
      return NextResponse.json({ error: "无效的建议角色ID" }, { status: 403 });
    }

    if (action === "delete") {
      // 删除角色
      await prisma.suggestedCharacter.delete({
        where: { id },
      });
      console.log(`[suggested-characters] Deleted character ${id}`);

      return NextResponse.json({
        success: true,
        action: "delete",
        id,
      });
    } else if (action === "update") {
      // 更新角色
      if (!updates) {
        return NextResponse.json({ error: "更新操作需要提供 updates 参数" }, { status: 400 });
      }

      const updated = await prisma.suggestedCharacter.update({
        where: { id },
        data: {
          ...updates,
          updated_at: new Date(),
        },
      });

      console.log(`[suggested-characters] Updated character ${id}`);

      return NextResponse.json({
        success: true,
        action: "update",
        character: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          appearance: updated.appearance,
          role: updated.role,
          generated: updated.generated,
          character_id: updated.character_id,
          image_url: updated.image_url,
          optimized_prompt: updated.optimized_prompt,
          generated_at: updated.generated_at,
        },
      });
    } else {
      return NextResponse.json({ error: "无效的 action 参数" }, { status: 400 });
    }
  } catch (error) {
    console.error("[suggested-characters] PATCH Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 }
    );
  }
}
