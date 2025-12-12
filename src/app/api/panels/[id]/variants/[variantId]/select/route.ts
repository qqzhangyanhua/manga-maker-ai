/**
 * Panel Variant Select API
 *
 * PATCH /api/panels/[id]/variants/[variantId]/select - Select variant
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SuccessResponse } from "@/types/template";

interface RouteParams {
  params: {
    id: string;
    variantId: string;
  };
}

/**
 * PATCH /api/panels/[id]/variants/[variantId]/select
 *
 * Select a variant (marks it as selected, unselects others of same panel)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: panelId, variantId } = params;

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

    // Check variant exists and belongs to panel
    const variant = await prisma.panelVariant.findUnique({
      where: { id: variantId },
      include: {
        panel: {
          include: {
            project: {
              select: { user_id: true }
            }
          }
        }
      }
    });

    if (!variant) {
      return NextResponse.json(
        { success: false, error: "变体不存在" },
        { status: 404 }
      );
    }

    if (variant.panel_id !== panelId) {
      return NextResponse.json(
        { success: false, error: "变体不属于此分镜" },
        { status: 400 }
      );
    }

    // Check ownership
    if (variant.panel.project.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权操作此变体" },
        { status: 403 }
      );
    }

    // Update variants in transaction:
    // 1. Unselect all other variants of this panel
    // 2. Select this variant
    // 3. Optionally update panel's generated_image to variant's image
    await prisma.$transaction([
      // Unselect all variants of this panel
      prisma.panelVariant.updateMany({
        where: { panel_id: panelId },
        data: { is_selected: false }
      }),
      // Select this variant
      prisma.panelVariant.update({
        where: { id: variantId },
        data: { is_selected: true }
      }),
      // Update panel's image to selected variant
      prisma.panel.update({
        where: { id: panelId },
        data: {
          generated_image: variant.image_url,
          prompt_used: variant.prompt
        }
      })
    ]);

    // Fetch updated variant
    const updatedVariant = await prisma.panelVariant.findUnique({
      where: { id: variantId }
    });

    const response: SuccessResponse<{ variant: typeof updatedVariant }> = {
      success: true,
      data: { variant: updatedVariant },
      message: "已选择此变体"
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("PATCH /api/panels/[id]/variants/[variantId]/select error:", error);
    return NextResponse.json(
      { success: false, error: "选择变体失败" },
      { status: 500 }
    );
  }
}
