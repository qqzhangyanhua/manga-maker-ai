import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";
import type { CharacterRole } from "@/types/phase2.types";

const VALID_ROLES: CharacterRole[] = ["protagonist", "antagonist", "supporting", "minor"];

/**
 * POST /api/story/[id]/characters
 * Add a character from library to story
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ userId }) => {
    const { id: storyId } = await params;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      const error = new Error("故事不存在") as any;
      error.status = 404;
      throw error;
    }

    if (story.user_id !== userId) {
      const error = new Error("无权访问此故事") as any;
      error.status = 403;
      throw error;
    }

    const body = await req.json();
    const { character_id, role, character_arc } = body as {
      character_id?: string;
      role?: string;
      character_arc?: string;
    };

    if (!character_id) {
      const error = new Error("缺少 character_id") as any;
      error.status = 400;
      throw error;
    }

    const validatedRole = (role && VALID_ROLES.includes(role as CharacterRole))
      ? (role as CharacterRole)
      : "supporting";

    const character = await prisma.character.findUnique({
      where: { id: character_id },
    });

    if (!character) {
      const error = new Error("角色不存在") as any;
      error.status = 404;
      throw error;
    }

    if (character.user_id !== userId) {
      const error = new Error("无权使用此角色") as any;
      error.status = 403;
      throw error;
    }

    const existing = await prisma.storyCharacter.findUnique({
      where: {
        story_id_character_id: {
          story_id: storyId,
          character_id: character_id,
        },
      },
    });

    if (existing) {
      const error = new Error("该角色已添加到此故事") as any;
      error.status = 400;
      throw error;
    }

    const maxOrder = await prisma.storyCharacter.aggregate({
      where: { story_id: storyId },
      _max: { display_order: true },
    });

    const newOrder = (maxOrder._max.display_order ?? -1) + 1;

    const storyCharacter = await prisma.storyCharacter.create({
      data: {
        story_id: storyId,
        character_id: character_id,
        role: validatedRole,
        character_arc: character_arc || null,
        display_order: newOrder,
      },
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
      story_character: storyCharacter,
      message: `角色 "${character.name}" 已添加到故事`,
    };
  });
}

/**
 * GET /api/story/[id]/characters
 * Get all characters in story with details
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async ({ userId }) => {
    const { id: storyId } = await params;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      const error = new Error("故事不存在") as any;
      error.status = 404;
      throw error;
    }

    if (story.user_id !== userId) {
      const error = new Error("无权访问此故事") as any;
      error.status = 403;
      throw error;
    }

    const storyCharacters = await prisma.storyCharacter.findMany({
      where: { story_id: storyId },
      orderBy: { display_order: "asc" },
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
      characters: storyCharacters,
    };
  });
}
