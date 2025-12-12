/**
 * Generated Images Batch Delete API
 *
 * POST /api/generated-images/batch-delete - Delete multiple generated images
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/generated-images/batch-delete
 *
 * Delete multiple generated images from the library
 *
 * Body:
 * - imageIds: string[] (required, 1-100 image IDs)
 */
export async function POST(req: Request) {
  try {
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

    // Parse request body
    const body = await req.json();
    const { imageIds } = body;

    // Validate input
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "请选择要删除的图像" },
        { status: 400 }
      );
    }

    if (imageIds.length > 100) {
      return NextResponse.json(
        { error: "一次最多删除100个图像" },
        { status: 400 }
      );
    }

    // Get images to verify ownership
    const images = await prisma.generatedImage.findMany({
      where: {
        id: { in: imageIds }
      },
      select: {
        id: true,
        user_id: true
      }
    });

    if (images.length === 0) {
      return NextResponse.json(
        { error: "未找到要删除的图像" },
        { status: 404 }
      );
    }

    // Verify all images belong to the user
    const notOwnedImages = images.filter(img => img.user_id !== payload.userId);
    if (notOwnedImages.length > 0) {
      return NextResponse.json(
        { error: "无权限删除部分图像" },
        { status: 403 }
      );
    }

    // Delete images
    const result = await prisma.generatedImage.deleteMany({
      where: {
        id: { in: imageIds },
        user_id: payload.userId
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.count
      },
      message: `成功删除 ${result.count} 个图像`
    });
  } catch (error) {
    console.error("Batch delete generated images error:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: `批量删除失败: ${message}` }, { status: 500 });
  }
}
