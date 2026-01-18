/**
 * Project Version Restore API
 *
 * POST /api/projects/[id]/versions/restore - Restore version
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { Prisma, prisma } from "@/lib/db";
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

    const versionData = version.version_data as Record<string, unknown>;
    const projectData = typeof versionData.project === "object" && versionData.project !== null && !Array.isArray(versionData.project)
      ? (versionData.project as Record<string, unknown>)
      : {};
    const projectTitle = typeof projectData.title === "string" ? projectData.title : "未命名项目";
    const projectDescription = typeof projectData.description === "string" ? projectData.description : null;
    const projectStyle = typeof projectData.style === "string" ? projectData.style : null;
    const panelsData = Array.isArray(versionData.panels) ? versionData.panels : [];
    const panelItems = panelsData.filter((panel): panel is Record<string, unknown> => typeof panel === "object" && panel !== null);
    const scriptData = typeof versionData.script === "object" && versionData.script !== null && !Array.isArray(versionData.script)
      ? (versionData.script as Record<string, unknown>)
      : null;

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
            version_data: backupData as Prisma.InputJsonValue,
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
          title: projectTitle,
          description: projectDescription,
          style: projectStyle
        }
      });

      // 2. Delete all current panels
      await tx.panel.deleteMany({
        where: { project_id: projectId }
      });

      // 3. Recreate panels from version
      if (panelItems.length > 0) {
        const asString = (value: unknown) => (typeof value === "string" ? value : null);
        await tx.panel.createMany({
          data: panelItems.map((panel, index) => {
            const panelOrder = typeof panel.panel_order === "number" ? panel.panel_order : index + 1;
            const panelType = typeof panel.panel_type === "string" ? panel.panel_type : "medium";
            const importance = typeof panel.importance === "string" ? panel.importance : "medium";
            const description = typeof panel.description === "string" ? panel.description : "无描述";

            return {
              project_id: projectId,
              panel_order: panelOrder,
              description,
              panel_type: panelType,
              importance,
              camera_angle: asString(panel.camera_angle),
              shot_size: asString(panel.shot_size),
              dialogue: asString(panel.dialogue),
              character_name: asString(panel.character_name),
              emotion: asString(panel.emotion),
              generated_image: asString(panel.generated_image),
              prompt_used: asString(panel.prompt_used)
            };
          })
        });
      }

      // 4. Update or create script
      if (scriptData) {
        const scriptContent = typeof scriptData.content === "string" ? scriptData.content : "";
        const scriptSegments = Array.isArray(scriptData.segments) ? scriptData.segments : [];
        const existingScript = await tx.storyScript.findUnique({
          where: { project_id: projectId }
        });

        if (existingScript) {
          await tx.storyScript.update({
            where: { project_id: projectId },
            data: {
              content: scriptContent,
              segments: scriptSegments as Prisma.InputJsonValue
            }
          });
        } else {
          await tx.storyScript.create({
            data: {
              project_id: projectId,
              content: scriptContent,
              segments: scriptSegments as Prisma.InputJsonValue
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
