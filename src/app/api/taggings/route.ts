/**
 * Tagging API Routes
 *
 * POST   /api/taggings - Add tag to resource
 * DELETE /api/taggings - Remove tag from resource
 * GET    /api/taggings - Get tags for a resource
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type TaggableType = "Character" | "Scene" | "Project" | "Story" | "PanelTemplate";

/**
 * GET /api/taggings
 *
 * Get all tags for a specific resource
 *
 * Query params:
 * - taggableType: string (required)
 * - taggableId: string (required)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const taggableType = searchParams.get("taggableType") as TaggableType | null;
    const taggableId = searchParams.get("taggableId");

    if (!taggableType || !taggableId) {
      return NextResponse.json(
        { success: false, error: "缺少必需参数" },
        { status: 400 }
      );
    }

    // Get taggings with tag details
    const taggings = await prisma.tagging.findMany({
      where: {
        taggable_type: taggableType,
        taggable_id: taggableId
      },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            type: true,
            category: true
          }
        }
      },
      orderBy: { created_at: "desc" }
    });

    return NextResponse.json({
      success: true,
      data: { taggings, tags: taggings.map(t => t.tag) }
    });
  } catch (error) {
    console.error("GET /api/taggings error:", error);
    return NextResponse.json(
      { success: false, error: "获取标签失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/taggings
 *
 * Add a tag to a resource
 *
 * Body:
 * - tagId: string (required)
 * - taggableType: "Character" | "Scene" | "Project" | "Story" | "PanelTemplate" (required)
 * - taggableId: string (required)
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
    const { tagId, taggableType, taggableId } = body;

    // Validate input
    if (!tagId || !taggableType || !taggableId) {
      return NextResponse.json(
        { success: false, error: "缺少必需参数" },
        { status: 400 }
      );
    }

    const validTypes: TaggableType[] = ["Character", "Scene", "Project", "Story", "PanelTemplate"];
    if (!validTypes.includes(taggableType as TaggableType)) {
      return NextResponse.json(
        { success: false, error: "无效的资源类型" },
        { status: 400 }
      );
    }

    // Check if tag exists
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      select: { id: true }
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, error: "标签不存在" },
        { status: 404 }
      );
    }

    // Verify user owns the resource
    const ownershipCheck = await verifyResourceOwnership(
      taggableType as TaggableType,
      taggableId,
      payload.userId
    );

    if (!ownershipCheck) {
      return NextResponse.json(
        { success: false, error: "资源不存在或无权限" },
        { status: 403 }
      );
    }

    // Check if tagging already exists
    const existingTagging = await prisma.tagging.findFirst({
      where: {
        tag_id: tagId,
        taggable_type: taggableType,
        taggable_id: taggableId
      }
    });

    if (existingTagging) {
      return NextResponse.json(
        { success: false, error: "该标签已添加" },
        { status: 409 }
      );
    }

    // Create tagging and increment usage count
    const tagging = await prisma.$transaction(async (tx) => {
      const newTagging = await tx.tagging.create({
        data: {
          tag_id: tagId,
          taggable_type: taggableType,
          taggable_id: taggableId
        },
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              type: true,
              category: true
            }
          }
        }
      });

      // Increment tag usage count
      await tx.tag.update({
        where: { id: tagId },
        data: { usage_count: { increment: 1 } }
      });

      return newTagging;
    });

    return NextResponse.json(
      {
        success: true,
        data: { tagging },
        message: "标签添加成功"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/taggings error:", error);
    return NextResponse.json(
      { success: false, error: "添加标签失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/taggings
 *
 * Remove a tag from a resource
 *
 * Body:
 * - tagId: string (required)
 * - taggableType: string (required)
 * - taggableId: string (required)
 */
export async function DELETE(req: NextRequest) {
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
    const { tagId, taggableType, taggableId } = body;

    // Validate input
    if (!tagId || !taggableType || !taggableId) {
      return NextResponse.json(
        { success: false, error: "缺少必需参数" },
        { status: 400 }
      );
    }

    // Verify user owns the resource
    const ownershipCheck = await verifyResourceOwnership(
      taggableType as TaggableType,
      taggableId,
      payload.userId
    );

    if (!ownershipCheck) {
      return NextResponse.json(
        { success: false, error: "资源不存在或无权限" },
        { status: 403 }
      );
    }

    // Find and delete tagging
    const tagging = await prisma.tagging.findFirst({
      where: {
        tag_id: tagId,
        taggable_type: taggableType,
        taggable_id: taggableId
      }
    });

    if (!tagging) {
      return NextResponse.json(
        { success: false, error: "标签关联不存在" },
        { status: 404 }
      );
    }

    // Delete tagging and decrement usage count
    await prisma.$transaction(async (tx) => {
      await tx.tagging.delete({
        where: { id: tagging.id }
      });

      // Decrement tag usage count
      await tx.tag.update({
        where: { id: tagId },
        data: { usage_count: { decrement: 1 } }
      });
    });

    return NextResponse.json({
      success: true,
      message: "标签移除成功"
    });
  } catch (error) {
    console.error("DELETE /api/taggings error:", error);
    return NextResponse.json(
      { success: false, error: "移除标签失败" },
      { status: 500 }
    );
  }
}

/**
 * Verify user owns the resource
 */
async function verifyResourceOwnership(
  taggableType: TaggableType,
  taggableId: string,
  userId: string
): Promise<boolean> {
  try {
    switch (taggableType) {
      case "Character": {
        const character = await prisma.character.findFirst({
          where: { id: taggableId, user_id: userId },
          select: { id: true }
        });
        return !!character;
      }
      case "Scene": {
        const scene = await prisma.scene.findFirst({
          where: { id: taggableId, user_id: userId },
          select: { id: true }
        });
        return !!scene;
      }
      case "Project": {
        const project = await prisma.project.findFirst({
          where: { id: taggableId, user_id: userId },
          select: { id: true }
        });
        return !!project;
      }
      case "Story": {
        const story = await prisma.story.findFirst({
          where: { id: taggableId, user_id: userId },
          select: { id: true }
        });
        return !!story;
      }
      case "PanelTemplate": {
        const template = await prisma.panelTemplate.findFirst({
          where: { id: taggableId, user_id: userId },
          select: { id: true }
        });
        return !!template;
      }
      default:
        return false;
    }
  } catch (error) {
    console.error("verifyResourceOwnership error:", error);
    return false;
  }
}
