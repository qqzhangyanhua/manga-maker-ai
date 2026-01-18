import { prisma } from "@/lib/db";
import { ApiError, withAuth } from "@/lib/api-helpers";
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
  return withAuth(async ({ userId }) => {
    const { id: storyId, characterId } = await params;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new ApiError("故事不存在", 404, "NOT_FOUND");
    }

    if (story.user_id !== userId) {
      throw new ApiError("无权访问此故事", 403, "FORBIDDEN");
    }

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
      throw new ApiError("该角色不在此故事中", 404, "NOT_FOUND");
    }

    await prisma.storyCharacter.delete({
      where: {
        story_id_character_id: {
          story_id: storyId,
          character_id: characterId,
        },
      },
    });

    const remaining = await prisma.storyCharacter.findMany({
      where: { story_id: storyId },
      orderBy: { display_order: "asc" },
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].display_order !== i) {
        await prisma.storyCharacter.update({
          where: { id: remaining[i].id },
          data: { display_order: i },
        });
      }
    }

    return {
      message: `角色 "${storyCharacter.character.name}" 已从故事中移除`,
    };
  });
}

/**
 * PATCH /api/story/[id]/characters/[characterId]
 * Update character's role/arc in story
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  return withAuth(async ({ userId }) => {
    const { id: storyId, characterId } = await params;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new ApiError("故事不存在", 404, "NOT_FOUND");
    }

    if (story.user_id !== userId) {
      throw new ApiError("无权访问此故事", 403, "FORBIDDEN");
    }

    const storyCharacter = await prisma.storyCharacter.findUnique({
      where: {
        story_id_character_id: {
          story_id: storyId,
          character_id: characterId,
        },
      },
    });

    if (!storyCharacter) {
      throw new ApiError("该角色不在此故事中", 404, "NOT_FOUND");
    }

    const body = await req.json();
    const { role, character_arc, display_order } = body as {
      role?: string;
      character_arc?: string;
      display_order?: number;
    };

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
        throw new ApiError(`无效的角色类型，必须是: ${VALID_ROLES.join(", ")}`, 400, "BAD_REQUEST");
      }
    }

    if (character_arc !== undefined) {
      updateData.character_arc = character_arc || null;
    }

    if (display_order !== undefined && typeof display_order === "number") {
      updateData.display_order = display_order;
    }

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

    return {
      story_character: updated,
      message: "角色信息已更新",
    };
  });
}
