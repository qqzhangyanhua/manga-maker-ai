import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/character - Get all characters for current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const characters = await prisma.character.findMany({
      where: { user_id: payload.userId },
      include: {
        views: true,
        expressions: true,
        outfits: true,
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ characters });
  } catch (error) {
    console.error("Get characters error:", error);
    return NextResponse.json(
      { error: "获取角色列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/character - Create new character
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, base_prompt, tags, base_image_url } = body;

    if (!name) {
      return NextResponse.json({ error: "角色名称不能为空" }, { status: 400 });
    }

    const character = await prisma.character.create({
      data: {
        user_id: payload.userId,
        name,
        description: description || null,
        base_prompt: base_prompt || "",
        tags: tags || [],
        base_image_url: base_image_url || null,
        training_status: "pending",
      },
    });

    // Create default outfit
    await prisma.characterOutfit.create({
      data: {
        character_id: character.id,
        outfit_name: "默认装",
        outfit_type: "default",
        is_default: true,
      },
    });

    return NextResponse.json({ character }, { status: 201 });
  } catch (error) {
    console.error("Create character error:", error);
    return NextResponse.json(
      { error: "创建角色失败" },
      { status: 500 }
    );
  }
}
