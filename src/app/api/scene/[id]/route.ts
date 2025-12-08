import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/scene/[id]
 * 获取场景详情
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    const scene = await prisma.scene.findUnique({
      where: { id },
    });

    if (!scene) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    // 验证场景属于当前用户
    if (scene.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权访问该场景" }, { status: 403 });
    }

    return NextResponse.json(scene);
  } catch (error) {
    console.error("Get scene error:", error);
    return NextResponse.json(
      { error: "获取场景失败" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/scene/[id]
 * 更新场景信息
 * Body:
 *  - name: string (optional)
 *  - description: string (optional)
 *  - scene_type: string (optional)
 *  - image_url: string (optional)
 *  - tags: string[] (optional)
 *  - prompt: string (optional)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const body = await request.json();

    // 验证场景存在且属于当前用户
    const existingScene = await prisma.scene.findUnique({
      where: { id },
    });

    if (!existingScene) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    if (existingScene.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权修改该场景" }, { status: 403 });
    }

    // 验证scene_type（如果提供）
    if (body.scene_type) {
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

      if (!validSceneTypes.includes(body.scene_type)) {
        return NextResponse.json(
          { error: `场景类型必须是以下之一: ${validSceneTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const updateData: {
      name?: string;
      description?: string | null;
      scene_type?: string;
      image_url?: string | null;
      tags?: string[];
      prompt?: string | null;
      updated_at: Date;
    } = {
      updated_at: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.scene_type !== undefined) updateData.scene_type = body.scene_type;
    if (body.image_url !== undefined) updateData.image_url = body.image_url || null;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.prompt !== undefined) updateData.prompt = body.prompt || null;

    const updatedScene = await prisma.scene.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedScene);
  } catch (error) {
    console.error("Update scene error:", error);
    return NextResponse.json(
      { error: "更新场景失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scene/[id]
 * 删除场景
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    // 验证场景存在且属于当前用户
    const existingScene = await prisma.scene.findUnique({
      where: { id },
    });

    if (!existingScene) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    if (existingScene.user_id !== payload.userId) {
      return NextResponse.json({ error: "无权删除该场景" }, { status: 403 });
    }

    await prisma.scene.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete scene error:", error);
    return NextResponse.json(
      { error: "删除场景失败" },
      { status: 500 }
    );
  }
}
