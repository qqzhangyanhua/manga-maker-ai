/**
 * Single Generated Image API Routes
 *
 * GET    /api/generated-images/[id] - Get image details
 * DELETE /api/generated-images/[id] - Delete image
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/generated-images/[id]
 *
 * Get details of a specific generated image
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Require authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: "无效的token" },
        { status: 401 }
      );
    }

    // Get image
    const image = await prisma.generatedImage.findUnique({
      where: { id }
    });

    if (!image) {
      return NextResponse.json(
        { success: false, error: "图像不存在" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (image.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权限访问该图像" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { image }
    });
  } catch (error) {
    console.error("GET /api/generated-images/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "获取图像详情失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/generated-images/[id]
 *
 * Delete a generated image from the library
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Require authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);
    if (!payload?.userId) {
      return NextResponse.json(
        { success: false, error: "无效的token" },
        { status: 401 }
      );
    }

    // Get image to verify ownership
    const image = await prisma.generatedImage.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true
      }
    });

    if (!image) {
      return NextResponse.json(
        { success: false, error: "图像不存在" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (image.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权限删除该图像" },
        { status: 403 }
      );
    }

    // Delete image
    await prisma.generatedImage.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: "图像删除成功"
    });
  } catch (error) {
    console.error("DELETE /api/generated-images/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "删除图像失败" },
      { status: 500 }
    );
  }
}
