/**
 * Template Like API
 *
 * POST /api/templates/[id]/like - Toggle like/unlike
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SuccessResponse } from "@/types/template";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/templates/[id]/like
 *
 * Toggle like status for a template
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: templateId } = params;

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

    // Check if template exists
    const template = await prisma.panelTemplate.findUnique({
      where: { id: templateId },
      select: { id: true }
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
        { status: 404 }
      );
    }

    // Check if already liked
    const existingLike = await prisma.templateLike.findUnique({
      where: {
        template_id_user_id: {
          template_id: templateId,
          user_id: payload.userId
        }
      }
    });

    let liked: boolean;

    if (existingLike) {
      // Unlike: delete like and decrement count
      await prisma.$transaction([
        prisma.templateLike.delete({
          where: {
            template_id_user_id: {
              template_id: templateId,
              user_id: payload.userId
            }
          }
        }),
        prisma.panelTemplate.update({
          where: { id: templateId },
          data: { likes_count: { decrement: 1 } }
        })
      ]);
      liked = false;
    } else {
      // Like: create like and increment count
      await prisma.$transaction([
        prisma.templateLike.create({
          data: {
            template_id: templateId,
            user_id: payload.userId
          }
        }),
        prisma.panelTemplate.update({
          where: { id: templateId },
          data: { likes_count: { increment: 1 } }
        })
      ]);
      liked = true;
    }

    // Get updated likes count
    const updatedTemplate = await prisma.panelTemplate.findUnique({
      where: { id: templateId },
      select: { likes_count: true }
    });

    const response: SuccessResponse<{
      liked: boolean;
      likesCount: number;
    }> = {
      success: true,
      data: {
        liked,
        likesCount: updatedTemplate?.likes_count || 0
      },
      message: liked ? "已点赞" : "已取消点赞"
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/templates/[id]/like error:", error);
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    );
  }
}
