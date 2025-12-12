/**
 * Project Version Detail API
 *
 * GET   /api/projects/[id]/versions/[versionId] - Get version details
 * PATCH /api/projects/[id]/versions/[versionId] - Update version (label/pin)
 * DELETE /api/projects/[id]/versions/[versionId] - Delete version
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SuccessResponse } from "@/types/template";

interface RouteParams {
  params: {
    id: string;
    versionId: string;
  };
}

/**
 * GET /api/projects/[id]/versions/[versionId]
 *
 * Get version details
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, versionId } = params;

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

    // Check project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { user_id: true }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权访问此项目" },
        { status: 403 }
      );
    }

    // Fetch version
    const version = await prisma.projectVersion.findUnique({
      where: { id: versionId },
      include: {
        project: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!version) {
      return NextResponse.json(
        { success: false, error: "版本不存在" },
        { status: 404 }
      );
    }

    if (version.project_id !== projectId) {
      return NextResponse.json(
        { success: false, error: "版本不属于此项目" },
        { status: 400 }
      );
    }

    const response: SuccessResponse<{ version: typeof version }> = {
      success: true,
      data: { version }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/projects/[id]/versions/[versionId] error:", error);
    return NextResponse.json(
      { success: false, error: "获取版本详情失败" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/versions/[versionId]
 *
 * Update version metadata
 *
 * Body:
 * - label?: string
 * - isPinned?: boolean
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, versionId } = params;

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
    const { label, isPinned } = body;

    // Check project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { user_id: true }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权操作此项目" },
        { status: 403 }
      );
    }

    // Check version exists and belongs to project
    const version = await prisma.projectVersion.findUnique({
      where: { id: versionId },
      select: { id: true, project_id: true }
    });

    if (!version) {
      return NextResponse.json(
        { success: false, error: "版本不存在" },
        { status: 404 }
      );
    }

    if (version.project_id !== projectId) {
      return NextResponse.json(
        { success: false, error: "版本不属于此项目" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (label !== undefined) {
      updateData.label = label?.trim() || null;
      updateData.is_auto = false; // Label means manual version
    }
    if (isPinned !== undefined) {
      updateData.is_pinned = isPinned === true;
    }

    // Update version
    const updatedVersion = await prisma.projectVersion.update({
      where: { id: versionId },
      data: updateData
    });

    const response: SuccessResponse<{ version: typeof updatedVersion }> = {
      success: true,
      data: { version: updatedVersion },
      message: "版本更新成功"
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("PATCH /api/projects/[id]/versions/[versionId] error:", error);
    return NextResponse.json(
      { success: false, error: "更新版本失败" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/versions/[versionId]
 *
 * Delete a version (cannot delete pinned versions)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, versionId } = params;

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

    // Check project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { user_id: true }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    if (project.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权操作此项目" },
        { status: 403 }
      );
    }

    // Check version exists and can be deleted
    const version = await prisma.projectVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        project_id: true,
        is_pinned: true
      }
    });

    if (!version) {
      return NextResponse.json(
        { success: false, error: "版本不存在" },
        { status: 404 }
      );
    }

    if (version.project_id !== projectId) {
      return NextResponse.json(
        { success: false, error: "版本不属于此项目" },
        { status: 400 }
      );
    }

    if (version.is_pinned) {
      return NextResponse.json(
        { success: false, error: "固定版本不可删除，请先取消固定" },
        { status: 400 }
      );
    }

    // Delete version
    await prisma.projectVersion.delete({
      where: { id: versionId }
    });

    const response: SuccessResponse<null> = {
      success: true,
      data: null,
      message: "版本删除成功"
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("DELETE /api/projects/[id]/versions/[versionId] error:", error);
    return NextResponse.json(
      { success: false, error: "删除版本失败" },
      { status: 500 }
    );
  }
}
