/**
 * Template Detail API Routes
 *
 * GET    /api/templates/[id] - Get template details
 * PATCH  /api/templates/[id] - Update template
 * DELETE /api/templates/[id] - Delete template
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
 * GET /api/templates/[id]
 *
 * Get template details including full template_data
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const template = await prisma.panelTemplate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        _count: {
          select: {
            likes: true
          }
        }
      }
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
        { status: 404 }
      );
    }

    // Check access permission
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    let userId: string | null = null;

    if (token) {
      const payload = verifyAuthToken(token);
      userId = payload?.userId || null;
    }

    // If template is not public and not owned by current user
    if (!template.is_public && template.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: "无权访问此模板" },
        { status: 403 }
      );
    }

    // Increment usage count
    await prisma.panelTemplate.update({
      where: { id },
      data: { usage_count: { increment: 1 } }
    });

    const response: SuccessResponse<{ template: typeof template }> = {
      success: true,
      data: { template }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/templates/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "获取模板详情失败" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/templates/[id]
 *
 * Update template (owner only)
 *
 * Body:
 * - name: string (optional)
 * - description: string (optional)
 * - tags: string[] (optional)
 * - isPublic: boolean (optional)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

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

    // Check ownership
    const existingTemplate = await prisma.panelTemplate.findUnique({
      where: { id },
      select: { user_id: true, is_official: true }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
        { status: 404 }
      );
    }

    if (existingTemplate.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权修改此模板" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { name, description, tags, isPublic } = body;

    // Build update data
    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return NextResponse.json(
          { success: false, error: "模板名称至少2个字符" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json(
          { success: false, error: "标签必须是数组" },
          { status: 400 }
        );
      }
      updateData.tags = tags.filter(Boolean);
    }

    if (isPublic !== undefined) {
      updateData.is_public = isPublic === true;
    }

    // Update template
    const template = await prisma.panelTemplate.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    });

    const response: SuccessResponse<{ template: typeof template }> = {
      success: true,
      data: { template },
      message: "模板更新成功"
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("PATCH /api/templates/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "更新模板失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id]
 *
 * Delete template (owner only)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

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

    // Check ownership
    const existingTemplate = await prisma.panelTemplate.findUnique({
      where: { id },
      select: { user_id: true, is_official: true }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
        { status: 404 }
      );
    }

    if (existingTemplate.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权删除此模板" },
        { status: 403 }
      );
    }

    // Cannot delete official templates
    if (existingTemplate.is_official) {
      return NextResponse.json(
        { success: false, error: "官方模板不可删除" },
        { status: 403 }
      );
    }

    // Delete template (cascade deletes likes)
    await prisma.panelTemplate.delete({
      where: { id }
    });

    const response: SuccessResponse<null> = {
      success: true,
      data: null,
      message: "模板删除成功"
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("DELETE /api/templates/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "删除模板失败" },
      { status: 500 }
    );
  }
}
