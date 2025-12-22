import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } from "@/lib/minio";
import type { CharacterRole } from "@/types/phase2.types";

const VALID_ROLES: CharacterRole[] = ["protagonist", "antagonist", "supporting", "minor"];

interface SaveCharacterInput {
  name: string;
  description: string;
  base_prompt: string;
  role: CharacterRole;
  image_base64: string;
  comic_style_id?: string;
}

/**
 * POST /api/story/[id]/save-generated-characters
 * 保存AI生成的角色到角色库，并关联到故事
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
    const { characters } = body as { characters: SaveCharacterInput[] };

    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return NextResponse.json(
        { error: "请提供要保存的角色数据" },
        { status: 400 }
      );
    }

    // Get current max display_order for story characters
    const maxOrderResult = await prisma.storyCharacter.aggregate({
      where: { story_id: storyId },
      _max: { display_order: true },
    });
    let currentOrder = maxOrderResult._max.display_order ?? -1;

    // Ensure bucket exists
    await ensureBucketExists();

    // Process each character
    const savedCharacters = [];

    for (const charInput of characters) {
      // Validate role
      const validatedRole = VALID_ROLES.includes(charInput.role)
        ? charInput.role
        : "supporting";

      // Create character record first to get ID
      const character = await prisma.character.create({
        data: {
          user_id: payload.userId,
          name: charInput.name,
          description: charInput.description,
          base_prompt: charInput.base_prompt,
          tags: [],
          training_status: "pending",
          comic_style_id: charInput.comic_style_id || story.comic_style_id || null,
        },
      });

      // Upload image to MinIO if provided
      let imageUrl = "";
      if (charInput.image_base64) {
        try {
          imageUrl = await uploadCharacterImage(
            charInput.image_base64,
            payload.userId,
            character.id
          );

          // Update character with image URL
          await prisma.character.update({
            where: { id: character.id },
            data: { base_image_url: imageUrl },
          });
        } catch (uploadError) {
          console.error(`[save-generated-characters] Image upload failed for ${charInput.name}:`, uploadError);
          // Continue without image
        }
      }

      // Create default outfit
      await prisma.characterOutfit.create({
        data: {
          character_id: character.id,
          outfit_type: "default",
          outfit_name: "默认装",
          prompt_modifier: "",
        },
      });

      // Create StoryCharacter association
      currentOrder += 1;
      const storyCharacter = await prisma.storyCharacter.create({
        data: {
          story_id: storyId,
          character_id: character.id,
          role: validatedRole,
          display_order: currentOrder,
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

      savedCharacters.push({
        character_id: character.id,
        name: character.name,
        role: validatedRole,
        image_url: imageUrl,
        story_character: storyCharacter,
      });
    }

    return NextResponse.json({
      success: true,
      saved_count: savedCharacters.length,
      characters: savedCharacters,
    });

  } catch (error) {
    console.error("[save-generated-characters] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存角色失败" },
      { status: 500 }
    );
  }
}

/**
 * Upload base64 image to MinIO for character
 */
async function uploadCharacterImage(
  base64Data: string,
  userId: string,
  characterId: string
): Promise<string> {
  // Handle both with and without data URI prefix
  let base64String = base64Data;
  let mimeType = "image/png";

  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (matches) {
    mimeType = matches[1];
    base64String = matches[2];
  }

  // Convert base64 to Buffer
  const buffer = Buffer.from(base64String, "base64");

  // Generate object name
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = mimeType.includes("png") ? ".png" : ".jpg";
  const objectName = `users/${userId}/characters/${characterId}/base_${timestamp}_${randomStr}${extension}`;

  // Upload to MinIO
  await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
    "Content-Type": mimeType,
  });

  // Return public URL
  return getPublicUrl(objectName);
}
