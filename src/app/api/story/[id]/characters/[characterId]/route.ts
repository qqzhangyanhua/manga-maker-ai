import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { CharacterRole } from "@/types/phase2.types";

const VALID_ROLES: CharacterRole[] = ["protagonist", "antagonist", "supporting", "minor"];

/**
 * DELETE /api/story/[id]/characters/[characterId]
 * Remove a character from story (does not delete the character itself)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id: storyId, characterId } = await params;

    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // Get story and verify ownership
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // Find and delete the story-character link
    const storyCharacter = await prisma.storyCharacter.findUnique({
      where: {
        story_id_character_id: {
          story_id: storyId,
          character_id: characterId,
        },
      },
      include: {
        character: true,
      },
    });

    if (!storyCharacter) {
      return NextResponse.json(
        { error: "该角色不在此故事中" },
        { status: 404 }
      );
    }

    // Delete the link
    await prisma.storyCharacter.delete({
      where: {
        story_id_character_id: {
          story_id: storyId,
          character_id: characterId,
        },
      },
    });

    // Reorder remaining characters
    const remaining = await prisma.storyCharacter.findMany({
      where: { story_id: storyId },
      orderBy: { display_order: "asc" },
    });

    // Update display_order for remaining characters
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].display_order !== i) {
        await prisma.storyCharacter.update({
          where: { id: remaining[i].id },
          data: { display_order: i },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `角色 "${storyCharacter.character.name}" 已从故事中移除`,
    });
  } catch (error) {
    console.error("Remove story character error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/story/[id]/characters/[characterId]
 * Update character's role/arc in story
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { id: storyId, characterId } = await params;

    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // Get story and verify ownership
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return NextResponse.json({ error: "故事不存在" }, { status: 404 });
    }

    if (story.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问此故事" }, { status: 403 });
    }

    // Find the story-character link
    const storyCharacter = await prisma.storyCharacter.findUnique({
      where: {
        story_id_character_id: {
          story_id: storyId,
          character_id: characterId,
        },
      },
    });

    if (!storyCharacter) {
      return NextResponse.json(
        { error: "该角色不在此故事中" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { role, character_arc, display_order } = body as {
      role?: string;
      character_arc?: string;
      display_order?: number;
    };

    // Build update data
    const updateData: {
      role?: string;
      character_arc?: string | null;
      display_order?: number;
      updated_at: Date;
    } = {
      updated_at: new Date(),
    };

    if (role !== undefined) {
      if (VALID_ROLES.includes(role as CharacterRole)) {
        updateData.role = role;
      } else {
        return NextResponse.json(
          { error: `无效的角色类型，必须是: ${VALID_ROLES.join(", ")}` },
          { status: 400 }
        );
      }
    }

    if (character_arc !== undefined) {
      updateData.character_arc = character_arc || null;
    }

    if (display_order !== undefined && typeof display_order === "number") {
      updateData.display_order = display_order;
    }

    // Update the story-character link
    const updated = await prisma.storyCharacter.update({
      where: {
        story_id_character_id: {
          story_id: storyId,
          character_id: characterId,
        },
      },
      data: updateData,
      include: {
        character: {
          include: {
            expressions: true,
            outfits: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      story_character: updated,
      message: "角色信息已更新",
    });
  } catch (error) {
    console.error("Update story character error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
