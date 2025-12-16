import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/character/[id] - Get character details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const character = await prisma.character.findFirst({
      where: {
        id,
        user_id: payload.userId,
      },
      include: {
        views: true,
        expressions: true,
        outfits: true,
        comic_style: {
          select: {
            id: true,
            style_key: true,
            name_zh: true,
            name_en: true,
            image_url: true,
            tag_color: true,
            prompt_prefix: true,
          },
        },
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json({ character });
  } catch (error) {
    console.error("Get character error:", error);
    return NextResponse.json({ error: "获取角色失败" }, { status: 500 });
  }
}

// PATCH /api/character/[id] - Update character
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, base_prompt, tags, base_image_url, training_status, comic_style_id } = body;

    // Validate comic_style_id if provided (null is allowed to unset)
    if (comic_style_id !== undefined && comic_style_id !== null) {
      const styleExists = await prisma.comicStyle.findUnique({
        where: { id: comic_style_id },
      });

      if (!styleExists) {
        return NextResponse.json({ error: "指定的漫画风格不存在" }, { status: 400 });
      }
    }

    const character = await prisma.character.updateMany({
      where: {
        id,
        user_id: payload.userId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(base_prompt !== undefined && { base_prompt }),
        ...(tags !== undefined && { tags }),
        ...(base_image_url !== undefined && { base_image_url }),
        ...(training_status !== undefined && { training_status }),
        ...(comic_style_id !== undefined && { comic_style_id }),
        updated_at: new Date(),
      },
    });

    if (character.count === 0) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    const updatedCharacter = await prisma.character.findUnique({
      where: { id },
      include: {
        views: true,
        expressions: true,
        outfits: true,
        comic_style: {
          select: {
            id: true,
            style_key: true,
            name_zh: true,
            name_en: true,
            image_url: true,
            tag_color: true,
            prompt_prefix: true,
          },
        },
      },
    });

    return NextResponse.json({ character: updatedCharacter });
  } catch (error) {
    console.error("Update character error:", error);
    return NextResponse.json({ error: "更新角色失败" }, { status: 500 });
  }
}

// DELETE /api/character/[id] - Delete character
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const result = await prisma.character.deleteMany({
      where: {
        id,
        user_id: payload.userId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete character error:", error);
    return NextResponse.json({ error: "删除角色失败" }, { status: 500 });
  }
}
