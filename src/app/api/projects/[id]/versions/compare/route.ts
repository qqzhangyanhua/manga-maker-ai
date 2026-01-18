/**
 * Project Version Compare API
 *
 * GET /api/projects/[id]/versions/compare - Compare two versions
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SuccessResponse, CompareVersionsResponse, VersionDiff, ProjectVersion, VersionPanel } from "@/types/template";

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

    const dataFrom = versionFrom.version_data as Record<string, unknown>;
    const dataTo = versionTo.version_data as Record<string, unknown>;

    const projectFrom = typeof dataFrom.project === "object" && dataFrom.project !== null && !Array.isArray(dataFrom.project)
      ? (dataFrom.project as Record<string, unknown>)
      : {};
    const projectTo = typeof dataTo.project === "object" && dataTo.project !== null && !Array.isArray(dataTo.project)
      ? (dataTo.project as Record<string, unknown>)
      : {};

    const projectChanges: string[] = [];
    const projectValues: { from: Record<string, unknown>; to: Record<string, unknown> } = {
      from: {},
      to: {}
    };

    if (projectFrom.title !== projectTo.title) {
      projectChanges.push("title");
      projectValues.from.title = projectFrom.title;
      projectValues.to.title = projectTo.title;
    }

    if (projectFrom.description !== projectTo.description) {
      projectChanges.push("description");
      projectValues.from.description = projectFrom.description;
      projectValues.to.description = projectTo.description;
    }

    if (projectFrom.style !== projectTo.style) {
      projectChanges.push("style");
      projectValues.from.style = projectFrom.style;
      projectValues.to.style = projectTo.style;
    }

    const panelsFromRaw = Array.isArray(dataFrom.panels) ? dataFrom.panels : [];
    const panelsToRaw = Array.isArray(dataTo.panels) ? dataTo.panels : [];

    const normalizePanels = (panels: unknown[]) =>
      panels.filter((panel): panel is Record<string, unknown> => typeof panel === "object" && panel !== null);

    const panelsFrom = normalizePanels(panelsFromRaw);
    const panelsTo = normalizePanels(panelsToRaw);

    const panelMapFrom = new Map<string, Record<string, unknown>>();
    const panelMapTo = new Map<string, Record<string, unknown>>();

    for (const panel of panelsFrom) {
      const id = typeof panel.id === "string" ? panel.id : null;
      if (id) panelMapFrom.set(id, panel);
    }

    for (const panel of panelsTo) {
      const id = typeof panel.id === "string" ? panel.id : null;
      if (id) panelMapTo.set(id, panel);
    }

    const toVersionPanel = (panel: Record<string, unknown>): VersionPanel => ({
      id: typeof panel.id === "string" ? panel.id : "",
      panel_order: typeof panel.panel_order === "number" ? panel.panel_order : 0,
      description: typeof panel.description === "string" ? panel.description : "",
      panel_type: typeof panel.panel_type === "string" ? panel.panel_type : "",
      importance: typeof panel.importance === "string" ? panel.importance : "",
      camera_angle: typeof panel.camera_angle === "string" ? panel.camera_angle : null,
      shot_size: typeof panel.shot_size === "string" ? panel.shot_size : null,
      dialogue: typeof panel.dialogue === "string" ? panel.dialogue : null,
      character_id: typeof panel.character_id === "string" ? panel.character_id : null,
      emotion: typeof panel.emotion === "string" ? panel.emotion : null,
      generated_image: typeof panel.generated_image === "string" ? panel.generated_image : null,
      prompt_used: typeof panel.prompt_used === "string" ? panel.prompt_used : null,
    });

    const addedPanels = panelsTo.filter((panel) => {
      const id = typeof panel.id === "string" ? panel.id : null;
      return id ? !panelMapFrom.has(id) : false;
    }).map(toVersionPanel);

    const removedPanels = panelsFrom.filter((panel) => {
      const id = typeof panel.id === "string" ? panel.id : null;
      return id ? !panelMapTo.has(id) : false;
    }).map(toVersionPanel);

    const modifiedPanels: Array<{ panelId: string; changes: string[] }> = [];

    panelsTo.forEach((panelTo) => {
      const panelId = typeof panelTo.id === "string" ? panelTo.id : null;
      if (!panelId) return;
      const panelFrom = panelMapFrom.get(panelId);
      if (!panelFrom) return;

      const changes: string[] = [];

      const fieldsToCompare = [
        "description", "panel_type", "importance", "camera_angle",
        "shot_size", "dialogue", "character_name", "emotion",
        "generated_image", "prompt_used", "panel_order"
      ] as const;

      fieldsToCompare.forEach((field) => {
        if (panelFrom[field] !== panelTo[field]) {
          changes.push(field);
        }
      });

      if (changes.length > 0) {
        modifiedPanels.push({
          panelId,
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
