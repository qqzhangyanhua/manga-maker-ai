/**
 * Template Apply API
 *
 * POST /api/templates/[id]/apply - Apply template to project
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

interface ApplyTemplateRequestBody {
  projectId: string;
  insertAfterOrder?: number;
  mode: "insert" | "replace";
  targetPanelIds?: string[];
}

/**
 * POST /api/templates/[id]/apply
 *
 * Apply template to a project
 *
 * Body:
 * - projectId: string (required)
 * - mode: "insert" | "replace" (required)
 * - insertAfterOrder: number (optional, for insert mode)
 * - targetPanelIds: string[] (optional, for replace mode)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: templateId } = params;

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
    const body: ApplyTemplateRequestBody = await req.json();
    const { projectId, insertAfterOrder, mode, targetPanelIds } = body;

    // Validate input
    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { success: false, error: "项目ID不能为空" },
        { status: 400 }
      );
    }

    if (mode !== "insert" && mode !== "replace") {
      return NextResponse.json(
        { success: false, error: "模式必须是 insert 或 replace" },
        { status: 400 }
      );
    }

    if (mode === "replace" && (!targetPanelIds || targetPanelIds.length === 0)) {
      return NextResponse.json(
        { success: false, error: "替换模式需要指定目标分镜" },
        { status: 400 }
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
        { success: false, error: "无权操作此项目" },
        { status: 403 }
      );
    }

    // Check template exists
    const template = await prisma.panelTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        template_data: true,
        panel_count: true,
        usage_count: true,
        is_public: true,
        is_official: true,
        user_id: true
      }
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
        { status: 404 }
      );
    }

    // Check template access permission
    if (!template.is_public && !template.is_official && template.user_id !== payload.userId) {
      return NextResponse.json(
        { success: false, error: "无权访问此模板" },
        { status: 403 }
      );
    }

    // Parse template data
    const templateData = template.template_data as { panels: Array<{
      panel_type: string | null;
      camera_angle: string | null;
      shot_size: string | null;
      importance: "high" | "medium" | "low" | null;
      relative_position: number;
    }> };

    if (!templateData.panels || !Array.isArray(templateData.panels)) {
      return NextResponse.json(
        { success: false, error: "模板数据格式错误" },
        { status: 500 }
      );
    }

    let createdPanels;

    if (mode === "insert") {
      // INSERT MODE: Insert template panels at specified position
      const insertPosition = insertAfterOrder ?? -1;

      // Get existing panels to reorder
      const existingPanels = await prisma.panel.findMany({
        where: { project_id: projectId },
        select: { id: true, panel_order: true },
        orderBy: { panel_order: "asc" }
      });

      // Calculate new panel orders
      const panelsToUpdate = existingPanels
        .filter(p => p.panel_order > insertPosition)
        .map(p => ({
          id: p.id,
          newOrder: p.panel_order + template.panel_count
        }));

      // Execute in transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update existing panel orders
        for (const panel of panelsToUpdate) {
          await tx.panel.update({
            where: { id: panel.id },
            data: { panel_order: panel.newOrder }
          });
        }

        // 2. Create new panels from template
        const newPanels = await Promise.all(
          templateData.panels.map((panelConfig, index) =>
            tx.panel.create({
              data: {
                project_id: projectId,
                panel_order: insertPosition + 1 + index,
                panel_type: panelConfig.panel_type || "medium",
                camera_angle: panelConfig.camera_angle,
                shot_size: panelConfig.shot_size,
                importance: panelConfig.importance || "medium",
                description: `从模板「${template.name}」生成的分镜 ${index + 1}`,
                dialogue: null,
                character_name: null,
                emotion: null,
                generated_image: null,
                prompt_used: null
              }
            })
          )
        );

        // 3. Increment template usage count
        await tx.panelTemplate.update({
          where: { id: templateId },
          data: { usage_count: { increment: 1 } }
        });

        return newPanels;
      });

      createdPanels = result;
    } else {
      // REPLACE MODE: Replace selected panels with template panels
      if (!targetPanelIds || targetPanelIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "替换模式需要指定目标分镜" },
          { status: 400 }
        );
      }

      // Verify target panels exist and belong to project
      const targetPanels = await prisma.panel.findMany({
        where: {
          id: { in: targetPanelIds },
          project_id: projectId
        },
        select: { id: true, panel_order: true },
        orderBy: { panel_order: "asc" }
      });

      if (targetPanels.length !== targetPanelIds.length) {
        return NextResponse.json(
          { success: false, error: "部分目标分镜不存在" },
          { status: 404 }
        );
      }

      // Get min and max order of target panels
      const minOrder = Math.min(...targetPanels.map(p => p.panel_order));
      const maxOrder = Math.max(...targetPanels.map(p => p.panel_order));
      const targetCount = targetPanels.length;
      const templateCount = template.panel_count;
      const orderDiff = templateCount - targetCount;

      // Get all panels after the replace range
      const panelsAfter = await prisma.panel.findMany({
        where: {
          project_id: projectId,
          panel_order: { gt: maxOrder }
        },
        select: { id: true, panel_order: true },
        orderBy: { panel_order: "asc" }
      });

      // Execute in transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Delete target panels
        await tx.panel.deleteMany({
          where: { id: { in: targetPanelIds } }
        });

        // 2. Create new panels from template
        const newPanels = await Promise.all(
          templateData.panels.map((panelConfig, index) =>
            tx.panel.create({
              data: {
                project_id: projectId,
                panel_order: minOrder + index,
                panel_type: panelConfig.panel_type || "medium",
                camera_angle: panelConfig.camera_angle,
                shot_size: panelConfig.shot_size,
                importance: panelConfig.importance || "medium",
                description: `从模板「${template.name}」生成的分镜 ${index + 1}`,
                dialogue: null,
                character_name: null,
                emotion: null,
                generated_image: null,
                prompt_used: null
              }
            })
          )
        );

        // 3. Update panel orders after the replaced range (if needed)
        if (orderDiff !== 0) {
          for (const panel of panelsAfter) {
            await tx.panel.update({
              where: { id: panel.id },
              data: { panel_order: panel.panel_order + orderDiff }
            });
          }
        }

        // 4. Increment template usage count
        await tx.panelTemplate.update({
          where: { id: templateId },
          data: { usage_count: { increment: 1 } }
        });

        return newPanels;
      });

      createdPanels = result;
    }

    const response: SuccessResponse<{
      panels: typeof createdPanels;
      template: {
        id: string;
        name: string;
      };
    }> = {
      success: true,
      data: {
        panels: createdPanels,
        template: {
          id: template.id,
          name: template.name
        }
      },
      message: `成功应用模板「${template.name}」`
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/templates/[id]/apply error:", error);
    return NextResponse.json(
      { success: false, error: "应用模板失败" },
      { status: 500 }
    );
  }
}
