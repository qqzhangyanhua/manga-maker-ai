import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/scene
 * 获取用户的场景列表
 * Query params:
 *  - scene_type: string (optional) - 过滤场景类型
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sceneType = searchParams.get("scene_type");

    const where: {
      user_id: string;
      scene_type?: string;
    } = {
      user_id: payload.userId,
    };

    if (sceneType) {
      where.scene_type = sceneType;
    }

    const scenes = await prisma.scene.findMany({
      where,
      orderBy: [
        { usage_count: "desc" },
        { created_at: "desc" },
      ],
    });

    return NextResponse.json(scenes);
  } catch (error) {
    console.error("Get scenes error:", error);
    return NextResponse.json(
      { error: "获取场景列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scene
 * 创建新场景
 * Body:
 *  - name: string (required)
 *  - description: string (optional)
 *  - scene_type: string (required)
 *  - image_url: string (optional)
 *  - tags: string[] (optional)
 *  - prompt: string (optional)
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, scene_type, image_url, tags, prompt } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "场景名称是必填项" },
        { status: 400 }
      );
    }

    if (!scene_type || typeof scene_type !== "string") {
      return NextResponse.json(
        { error: "场景类型是必填项" },
        { status: 400 }
      );
    }

    const validSceneTypes = [
      "indoor",
      "outdoor",
      "urban",
      "nature",
      "fantasy",
      "scifi",
      "historical",
      "abstract",
    ];

    if (!validSceneTypes.includes(scene_type)) {
      return NextResponse.json(
        { error: `场景类型必须是以下之一: ${validSceneTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const scene = await prisma.scene.create({
      data: {
        user_id: payload.userId,
        name,
        description: description || null,
        scene_type,
        image_url: image_url || null,
        tags: tags || [],
        prompt: prompt || null,
      },
    });

    return NextResponse.json(scene, { status: 201 });
  } catch (error) {
    console.error("Create scene error:", error);
    return NextResponse.json(
      { error: "创建场景失败" },
      { status: 500 }
    );
  }
}
