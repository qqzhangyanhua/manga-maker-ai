/**
 * Project Version Compare API
 *
 * GET /api/projects/[id]/versions/compare - Compare two versions
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SuccessResponse, CompareVersionsResponse, VersionDiff, ProjectVersion } from "@/types/template";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/projects/[id]/versions/compare
 *
 * Compare two versions
 *
 * Query params:
 * - from: string (version ID, required)
 * - to: string (version ID, required)
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

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const fromVersionId = searchParams.get("from");
    const toVersionId = searchParams.get("to");

    if (!fromVersionId || !toVersionId) {
      return NextResponse.json(
        { success: false, error: "缺少对比版本参数" },
        { status: 400 }
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

    // Fetch both versions
    const [versionFrom, versionTo] = await Promise.all([
      prisma.projectVersion.findUnique({ where: { id: fromVersionId } }),
      prisma.projectVersion.findUnique({ where: { id: toVersionId } })
    ]);

    if (!versionFrom || !versionTo) {
      return NextResponse.json(
        { success: false, error: "版本不存在" },
        { status: 404 }
      );
    }

    if (versionFrom.project_id !== projectId || versionTo.project_id !== projectId) {
      return NextResponse.json(
        { success: false, error: "版本不属于此项目" },
        { status: 400 }
      );
    }

    // Parse version data
    const dataFrom = versionFrom.version_data as any;
    const dataTo = versionTo.version_data as any;

    // Compare project metadata
    const projectChanges: string[] = [];
    const projectValues: { from: Record<string, any>; to: Record<string, any> } = {
      from: {},
      to: {}
    };

    if (dataFrom.project.title !== dataTo.project.title) {
      projectChanges.push("title");
      projectValues.from.title = dataFrom.project.title;
      projectValues.to.title = dataTo.project.title;
    }

    if (dataFrom.project.description !== dataTo.project.description) {
      projectChanges.push("description");
      projectValues.from.description = dataFrom.project.description;
      projectValues.to.description = dataTo.project.description;
    }

    if (dataFrom.project.style !== dataTo.project.style) {
      projectChanges.push("style");
      projectValues.from.style = dataFrom.project.style;
      projectValues.to.style = dataTo.project.style;
    }

    // Compare panels
    const panelsFrom = dataFrom.panels || [];
    const panelsTo = dataTo.panels || [];

    // Create panel ID maps for comparison
    const panelMapFrom = new Map(panelsFrom.map((p: any) => [p.id, p]));
    const panelMapTo = new Map(panelsTo.map((p: any) => [p.id, p]));

    // Find added panels
    const addedPanels = panelsTo.filter((p: any) => !panelMapFrom.has(p.id));

    // Find removed panels
    const removedPanels = panelsFrom.filter((p: any) => !panelMapTo.has(p.id));

    // Find modified panels
    const modifiedPanels: Array<{ panelId: string; changes: string[] }> = [];

    panelsTo.forEach((panelTo: any) => {
      const panelFrom = panelMapFrom.get(panelTo.id);
      if (!panelFrom) return; // This is an added panel

      const changes: string[] = [];

      // Check each field for changes
      const fieldsToCompare = [
        'description', 'panel_type', 'importance', 'camera_angle',
        'shot_size', 'dialogue', 'character_name', 'emotion',
        'generated_image', 'prompt_used', 'panel_order'
      ];

      fieldsToCompare.forEach(field => {
        if (panelFrom[field] !== panelTo[field]) {
          changes.push(field);
        }
      });

      if (changes.length > 0) {
        modifiedPanels.push({
          panelId: panelTo.id,
          changes
        });
      }
    });

    // Build diff result
    const diff: VersionDiff = {
      project: {
        changed: projectChanges,
        values: projectValues
      },
      panels: {
        added: addedPanels,
        removed: removedPanels,
        modified: modifiedPanels
      }
    };

    const response: SuccessResponse<CompareVersionsResponse> = {
      success: true,
      data: {
        versionFrom: versionFrom as unknown as ProjectVersion,
        versionTo: versionTo as unknown as ProjectVersion,
        diff
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/projects/[id]/versions/compare error:", error);
    return NextResponse.json(
      { success: false, error: "对比版本失败" },
      { status: 500 }
    );
  }
}
