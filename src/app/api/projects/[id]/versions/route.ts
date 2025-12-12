/**
 * Project Versions API
 *
 * GET  /api/projects/[id]/versions - Get version history
 * POST /api/projects/[id]/versions - Create version snapshot
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SuccessResponse, CreateVersionInput, ProjectVersion } from "@/types/template";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/projects/[id]/versions
 *
 * Get project version history
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = params;

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
      select: { id: true, user_id: true }
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

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    // Count total versions
    const total = await prisma.projectVersion.count({
      where: { project_id: projectId }
    });

    // Query versions with pagination
    const versions = await prisma.projectVersion.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit
    });

    const response: SuccessResponse<{
      versions: typeof versions;
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }> = {
      success: true,
      data: {
        versions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/projects/[id]/versions error:", error);
    return NextResponse.json(
      { success: false, error: "获取版本历史失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/versions
 *
 * Create a new version snapshot
 *
 * Body:
 * - label?: string (optional user-defined label)
 * - createdByAction?: string (optional action that triggered this version)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = params;

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
    const body: CreateVersionInput = await req.json();
    const { label, createdByAction } = body;

    // Check project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        panels: {
          orderBy: { panel_order: "asc" },
          select: {
            id: true,
            panel_order: true,
            description: true,
            panel_type: true,
            importance: true,
            camera_angle: true,
            shot_size: true,
            dialogue: true,
            character_name: true,
            emotion: true,
            generated_image: true,
            prompt_used: true
          }
        },
        script: true
      }
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

    // Get current max version number
    const maxVersion = await prisma.projectVersion.findFirst({
      where: { project_id: projectId },
      orderBy: { version_number: "desc" },
      select: { version_number: true }
    });

    const nextVersionNumber = (maxVersion?.version_number || 0) + 1;

    // Build version data snapshot
    const versionData = {
      project: {
        title: project.title,
        description: project.description,
        style: project.style
      },
      panels: project.panels.map(panel => ({
        id: panel.id,
        panel_order: panel.panel_order,
        description: panel.description,
        panel_type: panel.panel_type,
        importance: panel.importance,
        camera_angle: panel.camera_angle,
        shot_size: panel.shot_size,
        dialogue: panel.dialogue,
        character_name: panel.character_name,
        emotion: panel.emotion,
        generated_image: panel.generated_image,
        prompt_used: panel.prompt_used
      })),
      script: project.script ? {
        content: project.script.content,
        segments: project.script.segments
      } : undefined
    };

    // Generate change summary
    let changeSummary = null;
    if (nextVersionNumber > 1) {
      const previousVersion = maxVersion ? await prisma.projectVersion.findFirst({
        where: {
          project_id: projectId,
          version_number: maxVersion.version_number
        },
        select: { version_data: true }
      }) : null;

      if (previousVersion) {
        const prevData = previousVersion.version_data as any;
        const changes: string[] = [];

        // Check project changes
        if (prevData.project.title !== versionData.project.title) {
          changes.push("标题已修改");
        }
        if (prevData.project.description !== versionData.project.description) {
          changes.push("描述已修改");
        }

        // Check panel changes
        const prevPanelCount = prevData.panels?.length || 0;
        const currPanelCount = versionData.panels.length;
        if (currPanelCount > prevPanelCount) {
          changes.push(`新增 ${currPanelCount - prevPanelCount} 个分镜`);
        } else if (currPanelCount < prevPanelCount) {
          changes.push(`删除 ${prevPanelCount - currPanelCount} 个分镜`);
        } else {
          // Check if panels were modified
          const modifiedCount = versionData.panels.filter((panel, idx) => {
            const prevPanel = prevData.panels[idx];
            return prevPanel && (
              prevPanel.description !== panel.description ||
              prevPanel.generated_image !== panel.generated_image
            );
          }).length;
          if (modifiedCount > 0) {
            changes.push(`修改 ${modifiedCount} 个分镜`);
          }
        }

        changeSummary = changes.length > 0 ? changes.join(", ") : "无变化";
      }
    }

    // Create version record
    const version = await prisma.projectVersion.create({
      data: {
        project_id: projectId,
        version_number: nextVersionNumber,
        label: label?.trim() || null,
        version_data: versionData as any,
        change_summary: changeSummary,
        is_auto: !label, // If no label provided, it's auto-save
        is_pinned: false,
        created_by_action: createdByAction || null
      }
    });

    // Auto-cleanup: keep only last 50 auto-save versions (non-pinned, non-labeled)
    const autoSaveVersions = await prisma.projectVersion.findMany({
      where: {
        project_id: projectId,
        is_auto: true,
        is_pinned: false,
        label: null
      },
      orderBy: { created_at: "desc" },
      select: { id: true },
      skip: 50 // Keep last 50
    });

    if (autoSaveVersions.length > 0) {
      await prisma.projectVersion.deleteMany({
        where: {
          id: { in: autoSaveVersions.map(v => v.id) }
        }
      });
    }

    const response: SuccessResponse<{ version: typeof version }> = {
      success: true,
      data: { version },
      message: "版本创建成功"
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/versions error:", error);
    return NextResponse.json(
      { success: false, error: "创建版本失败" },
      { status: 500 }
    );
  }
}
