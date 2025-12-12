/**
 * Generated Images API Routes
 *
 * GET  /api/generated-images - List user's generated images
 * POST /api/generated-images - Save a generated image
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/generated-images
 *
 * List user's generated images with pagination and filtering
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - style: string (optional filter by style)
 * - character_id: string (optional filter by character)
 * - search: string (optional search in prompt)
 */
export async function GET(req: NextRequest) {
  try {
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

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const style = searchParams.get("style");
    const characterId = searchParams.get("character_id");
    const search = searchParams.get("search");

    // Build where clause
    const where: {
      user_id: string;
      style?: string;
      character_id?: string;
      prompt?: { contains: string; mode: "insensitive" };
    } = {
      user_id: payload.userId
    };

    if (style) {
      where.style = style;
    }

    if (characterId) {
      where.character_id = characterId;
    }

    if (search) {
      where.prompt = {
        contains: search,
        mode: "insensitive"
      };
    }

    // Get total count
    const total = await prisma.generatedImage.count({ where });

    // Get images with pagination
    const images = await prisma.generatedImage.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: {
        images,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error("GET /api/generated-images error:", error);
    return NextResponse.json(
      { success: false, error: "获取图像列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/generated-images
 *
 * Save a generated image to the library
 *
 * Body:
 * - image_url: string (required)
 * - prompt: string (required)
 * - style: string (optional)
 * - character_id: string (optional)
 * - generation_params: object (optional) - { model, steps, cfg_scale, seed, etc. }
 */
export async function POST(req: NextRequest) {
  try {
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
    const body = await req.json();
    const { image_url, prompt, style, character_id, generation_params } = body;

    // Validate required fields
    if (!image_url || typeof image_url !== "string" || image_url.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "图像URL不能为空" },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "提示词不能为空" },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (style && typeof style !== "string") {
      return NextResponse.json(
        { success: false, error: "风格类型必须是字符串" },
        { status: 400 }
      );
    }

    if (character_id && typeof character_id !== "string") {
      return NextResponse.json(
        { success: false, error: "角色ID必须是字符串" },
        { status: 400 }
      );
    }

    // If character_id provided, verify ownership
    if (character_id) {
      const character = await prisma.character.findFirst({
        where: {
          id: character_id,
          user_id: payload.userId
        },
        select: { id: true }
      });

      if (!character) {
        return NextResponse.json(
          { success: false, error: "角色不存在或无权限" },
          { status: 403 }
        );
      }
    }

    // Validate generation_params if provided
    if (generation_params !== undefined && generation_params !== null) {
      if (typeof generation_params !== "object" || Array.isArray(generation_params)) {
        return NextResponse.json(
          { success: false, error: "生成参数必须是对象" },
          { status: 400 }
        );
      }
    }

    // Create generated image record
    const generatedImage = await prisma.generatedImage.create({
      data: {
        user_id: payload.userId,
        image_url: image_url.trim(),
        prompt: prompt.trim(),
        style: style?.trim() || null,
        character_id: character_id || null,
        generation_params: generation_params || null
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: { image: generatedImage },
        message: "图像保存成功"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/generated-images error:", error);
    return NextResponse.json(
      { success: false, error: "保存图像失败" },
      { status: 500 }
    );
  }
}
