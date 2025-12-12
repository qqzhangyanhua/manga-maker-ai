/**
 * Project Version Restore API
 *
 * POST /api/projects/[id]/versions/restore - Restore version
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SuccessResponse, RestoreVersionInput } from "@/types/template";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/projects/[id]/versions/restore
 *
 * Restore project to a specific version
 *
 * Body:
 * - versionId: string (required)
 * - createBackup?: boolean (default: true)
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
    const body: RestoreVersionInput = await req.json();
    const { versionId, createBackup = true } = body;

    if (!versionId) {
      return NextResponse.json(
        { success: false, error: "版本ID不能为空" },
        { status: 400 }
      );
    }

    // Check project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, user_id: true, title: true }
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

    // Fetch version to restore
    const version = await prisma.projectVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        project_id: true,
        version_number: true,
        version_data: true,
        label: true
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

    const versionData = version.version_data as any;

    // Create backup of current state if requested
    let backupVersion = null;
    if (createBackup) {
      const currentProject = await prisma.project.findUnique({
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

      if (currentProject) {
        const maxVersionNumber = await prisma.projectVersion.findFirst({
          where: { project_id: projectId },
          orderBy: { version_number: "desc" },
          select: { version_number: true }
        });

        const backupData = {
          project: {
            title: currentProject.title,
            description: currentProject.description,
            style: currentProject.style
          },
          panels: currentProject.panels.map(p => ({
            id: p.id,
            panel_order: p.panel_order,
            description: p.description,
            panel_type: p.panel_type,
            importance: p.importance,
            camera_angle: p.camera_angle,
            shot_size: p.shot_size,
            dialogue: p.dialogue,
            character_name: p.character_name,
            emotion: p.emotion,
            generated_image: p.generated_image,
            prompt_used: p.prompt_used
          })),
          script: currentProject.script ? {
            content: currentProject.script.content,
            segments: currentProject.script.segments
          } : undefined
        };

        backupVersion = await prisma.projectVersion.create({
          data: {
            project_id: projectId,
            version_number: (maxVersionNumber?.version_number || 0) + 1,
            label: `恢复前备份 (版本 ${version.version_number})`,
            version_data: backupData as any,
            change_summary: `恢复到版本 ${version.version_number} 前的自动备份`,
            is_auto: false,
            is_pinned: true,
            created_by_action: "restore_backup"
          }
        });
      }
    }

    // Restore project in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update project metadata
      await tx.project.update({
        where: { id: projectId },
        data: {
          title: versionData.project.title,
          description: versionData.project.description,
          style: versionData.project.style
        }
      });

      // 2. Delete all current panels
      await tx.panel.deleteMany({
        where: { project_id: projectId }
      });

      // 3. Recreate panels from version
      if (versionData.panels && versionData.panels.length > 0) {
        await tx.panel.createMany({
          data: versionData.panels.map((panel: any) => ({
            // Generate new IDs for panels
            project_id: projectId,
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
          }))
        });
      }

      // 4. Update or create script
      if (versionData.script) {
        const existingScript = await tx.storyScript.findUnique({
          where: { project_id: projectId }
        });

        if (existingScript) {
          await tx.storyScript.update({
            where: { project_id: projectId },
            data: {
              content: versionData.script.content,
              segments: versionData.script.segments
            }
          });
        } else {
          await tx.storyScript.create({
            data: {
              project_id: projectId,
              content: versionData.script.content,
              segments: versionData.script.segments
            }
          });
        }
      }
    });

    const response: SuccessResponse<{
      version: typeof version;
      backupVersion: typeof backupVersion;
    }> = {
      success: true,
      data: {
        version,
        backupVersion
      },
      message: `成功恢复到版本 ${version.version_number}${backupVersion ? "，已自动创建恢复前备份" : ""}`
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/projects/[id]/versions/restore error:", error);
    return NextResponse.json(
      { success: false, error: "恢复版本失败" },
      { status: 500 }
    );
  }
}
