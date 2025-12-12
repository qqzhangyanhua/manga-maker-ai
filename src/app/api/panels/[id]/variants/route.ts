/**
 * Panel Variants API
 *
 * GET  /api/panels/[id]/variants - Get panel variants
 * POST /api/panels/[id]/variants - Generate variants
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SuccessResponse, GenerateVariantsInput, GenerateVariantsResponse, PanelVariant } from "@/types/template";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/panels/[id]/variants
 *
 * Get all variants for a panel
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: panelId } = params;

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

    // Check panel exists and ownership
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        project: {
          select: { user_id: true }
        }
      }
    });

    if (!panel) {
      return NextResponse.json(
        { success: false, error: "分镜不存在" },
        { status: 404 }
      );
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权访问此分镜" },
        { status: 403 }
      );
    }

    // Fetch variants
    const variants = await prisma.panelVariant.findMany({
      where: { panel_id: panelId },
      orderBy: [
        { variant_type: "asc" },
        { created_at: "asc" }
      ]
    });

    const response: SuccessResponse<{ variants: typeof variants }> = {
      success: true,
      data: { variants }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/panels/[id]/variants error:", error);
    return NextResponse.json(
      { success: false, error: "获取变体失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/panels/[id]/variants
 *
 * Generate variants for a panel
 *
 * Body:
 * - count?: number (1-3, default: 1)
 * - variantTypes?: string[] (optional, e.g., ["composition", "lighting"])
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: panelId } = params;

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

    // Parse request body
    const body: GenerateVariantsInput = await req.json();
    const { count = 1, variantTypes } = body;

    // Validate count
    if (count < 1 || count > 3) {
      return NextResponse.json(
        { success: false, error: "变体数量必须在 1-3 之间" },
        { status: 400 }
      );
    }

    // Validate variant types
    const validTypes = ["composition", "lighting", "angle"];
    if (variantTypes && variantTypes.length > 0) {
      const invalidTypes = variantTypes.filter(t => !validTypes.includes(t));
      if (invalidTypes.length > 0) {
        return NextResponse.json(
          { success: false, error: `无效的变体类型: ${invalidTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Check panel exists and ownership
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        project: {
          select: {
            id: true,
            user_id: true,
            style: true
          }
        }
      }
    });

    if (!panel) {
      return NextResponse.json(
        { success: false, error: "分镜不存在" },
        { status: 404 }
      );
    }

    if (panel.project.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权操作此分镜" },
        { status: 403 }
      );
    }

    // Determine variant types to generate
    const typesToGenerate = variantTypes && variantTypes.length > 0
      ? variantTypes
      : ["composition", "lighting", "angle"].slice(0, count);

    // TODO: Generate variants using AI image generation
    // For now, create placeholder variant records
    // In production, this should:
    // 1. Build variant prompts based on original panel description
    // 2. Call AI image generation API (Stable Diffusion, DALL-E, etc.)
    // 3. Store generated image URLs
    // 4. Create variant records

    const variants = (await Promise.all(
      typesToGenerate.map(async (variantType, index) => {
        // Build variant prompt
        let variantPrompt = panel.description;

        if (variantType === "composition") {
          variantPrompt += " [构图变体: 调整画面构图和元素布局]";
        } else if (variantType === "lighting") {
          variantPrompt += " [光线变体: 改变光照方向和强度]";
        } else if (variantType === "angle") {
          variantPrompt += " [角度变体: 从不同视角展现场景]";
        }

        // Create variant record
        return await prisma.panelVariant.create({
          data: {
            panel_id: panelId,
            image_url: `https://placeholder.com/variant-${variantType}-${Date.now()}-${index}.png`,
            prompt: variantPrompt,
            variant_type: variantType as "composition" | "lighting" | "angle",
            is_selected: false
          }
        });
      })
    )) as PanelVariant[];

    const response: SuccessResponse<GenerateVariantsResponse> = {
      success: true,
      data: { variants },
      message: `成功生成 ${variants.length} 个变体`
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/panels/[id]/variants error:", error);
    return NextResponse.json(
      { success: false, error: "生成变体失败" },
      { status: 500 }
    );
  }
}
