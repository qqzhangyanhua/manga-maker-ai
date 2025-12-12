import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/character/[id]/pose-variants - Get all pose variants for a character
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: characterId } = await params;

    // Verify character ownership
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        user_id: payload.userId,
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    // Get all pose variants for this character
    const poseVariants = await prisma.generatedImage.findMany({
      where: {
        user_id: payload.userId,
        character_id: characterId,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      variants: poseVariants.map((v) => ({
        id: v.id,
        image_url: v.image_url,
        prompt: v.prompt,
        pose_name: (v.generation_params as { pose_name?: string })?.pose_name || "未命名姿势",
        pose_description: (v.generation_params as { pose_description?: string })?.pose_description || "",
        created_at: v.created_at,
      })),
    });
  } catch (error) {
    console.error("Get pose variants error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取姿势变体失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/character/[id]/pose-variants?variant_id=xxx - Delete a pose variant
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: characterId } = await params;
    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get("variant_id");

    if (!variantId) {
      return NextResponse.json({ error: "缺少 variant_id 参数" }, { status: 400 });
    }

    // Verify ownership
    const variant = await prisma.generatedImage.findFirst({
      where: {
        id: variantId,
        user_id: payload.userId,
        character_id: characterId,
      },
    });

    if (!variant) {
      return NextResponse.json({ error: "姿势变体不存在" }, { status: 404 });
    }

    // Delete the variant
    await prisma.generatedImage.delete({
      where: {
        id: variantId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "姿势变体已删除",
    });
  } catch (error) {
    console.error("Delete pose variant error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除姿势变体失败" },
      { status: 500 }
    );
  }
}
