import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
  try {
    const { id: storyId } = await params;

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

    // Parse request body
    const body = await req.json();
    const { character_id, role, character_arc } = body as {
      character_id?: string;
      role?: string;
      character_arc?: string;
    };

    if (!character_id) {
      return NextResponse.json(
        { error: "缺少 character_id" },
        { status: 400 }
      );
    }

    // Validate role
    const validatedRole = (role && VALID_ROLES.includes(role as CharacterRole))
      ? (role as CharacterRole)
      : "supporting";

    // Verify character exists and belongs to user
    const character = await prisma.character.findUnique({
      where: { id: character_id },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    if (character.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权使用此角色" }, { status: 403 });
    }

    // Check if already linked
    const existing = await prisma.storyCharacter.findUnique({
      where: {
        story_id_character_id: {
          story_id: storyId,
          character_id: character_id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "该角色已添加到此故事" },
        { status: 400 }
      );
    }

    // Get current max display_order
    const maxOrder = await prisma.storyCharacter.aggregate({
      where: { story_id: storyId },
      _max: { display_order: true },
    });

    const newOrder = (maxOrder._max.display_order ?? -1) + 1;

    // Create StoryCharacter link
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

    return NextResponse.json({
      success: true,
      story_character: storyCharacter,
      message: `角色 "${character.name}" 已添加到故事`,
    });
  } catch (error) {
    console.error("Add story character error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/story/[id]/characters
 * Get all characters in story with details
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;

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

    // Get all story characters with full character details
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

    return NextResponse.json({
      success: true,
      characters: storyCharacters,
    });
  } catch (error) {
    console.error("Get story characters error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
