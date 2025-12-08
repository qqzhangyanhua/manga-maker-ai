import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/character/relationship
 * 获取用户的角色关系图谱配置
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    // 获取用户的所有角色关系配置
    const relationships = await prisma.characterRelationship.findMany({
      where: { user_id: payload.userId },
      include: {
        // 注意：这里需要在 schema 中添加 relation，暂时先不 include
      },
      orderBy: { created_at: "asc" },
    });

    return NextResponse.json({ relationships });
  } catch (error) {
    console.error("Get relationships error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

/**
 * POST /api/character/relationship
 * 批量保存/更新角色关系图谱配置
 *
 * Request body:
 * {
 *   relationships: [
 *     {
 *       character_id: string,
 *       position_x: number,
 *       position_y: number,
 *       scale: number
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const body = await request.json();
    const { relationships } = body;

    if (!Array.isArray(relationships)) {
      return NextResponse.json(
        { error: "relationships 必须是数组" },
        { status: 400 }
      );
    }

    // 批量更新/创建关系配置
    const operations = relationships.map((rel) =>
      prisma.characterRelationship.upsert({
        where: {
          unique_user_character_relationship: {
            user_id: payload.userId,
            character_id: rel.character_id,
          },
        },
        update: {
          position_x: rel.position_x,
          position_y: rel.position_y,
          scale: rel.scale,
          updated_at: new Date(),
        },
        create: {
          user_id: payload.userId,
          character_id: rel.character_id,
          position_x: rel.position_x,
          position_y: rel.position_y,
          scale: rel.scale,
        },
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({
      success: true,
      message: "关系图谱已保存",
      count: relationships.length,
    });
  } catch (error) {
    console.error("Save relationships error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

/**
 * DELETE /api/character/relationship?character_id=xxx
 * 删除指定角色的关系配置
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "无效的token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("character_id");

    if (!characterId) {
      return NextResponse.json(
        { error: "缺少 character_id 参数" },
        { status: 400 }
      );
    }

    await prisma.characterRelationship.deleteMany({
      where: {
        user_id: payload.userId,
        character_id: characterId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "关系配置已删除",
    });
  } catch (error) {
    console.error("Delete relationship error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
