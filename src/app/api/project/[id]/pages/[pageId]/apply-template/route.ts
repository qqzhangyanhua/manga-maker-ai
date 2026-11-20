/**
 * 应用模板 API
 * POST /api/project/[id]/pages/[pageId]/apply-template - 应用模板到页面
 */

import { prisma } from "@/lib/db";
import { withAuth, ApiError, validateOwnership } from "@/lib/api-helpers";
import { transformComicPage } from "@/lib/layout/transform";
import type { ApplyTemplateRequest, MangaCanvasData, PanelSlot } from "@/types/layout";
import type { Prisma } from "@prisma/client";

// POST /api/project/[id]/pages/[pageId]/apply-template - 应用模板到页面
export async function POST(
  req: Request,
  { params }: { params: { id: string; pageId: string } }
) {
  return withAuth(async ({ userId }) => {
    // 验证项目所有权
    await validateOwnership(prisma.project, params.id, userId, "项目");

    const existingPage = await prisma.comicPage.findUnique({
      where: { id: params.pageId },
    });

    if (!existingPage) {
      throw new ApiError(404, "NOT_FOUND", "页面不存在");
    }

    if (existingPage.project_id !== params.id) {
      throw new ApiError(400, "INVALID_PAGE", "页面不属于该项目");
    }

    const body: ApplyTemplateRequest = await req.json();
    const { templateId, panelMapping } = body;

    // 获取模板
    const template = await prisma.layoutTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new ApiError(404, "TEMPLATE_NOT_FOUND", "模板不存在");
    }

    // 验证 panelMapping 中的 Panel 是否存在
    const panelIds = Object.values(panelMapping);
    if (panelIds.length > 0) {
      const panels = await prisma.panel.findMany({
        where: {
          id: { in: panelIds },
          project_id: params.id,
        },
        select: { id: true, generated_image: true },
      });

      const foundPanelIds = new Set(panels.map((p) => p.id));
      const invalidPanelIds = panelIds.filter((id) => !foundPanelIds.has(id));

      if (invalidPanelIds.length > 0) {
        throw new ApiError(
          400, "INVALID_PANEL_IDS", `以下 Panel 不存在或不属于该项目: ${invalidPanelIds.join(", ")}`
        );
      }
    }

    // 构建 canvas_data
    const panelSlots = template.panel_slots as unknown as PanelSlot[];
    const canvasData: MangaCanvasData = {
      version: "1.0",
      objects: [], // 实际的 Fabric.js 对象需要在前端生成
      mangaMeta: {
        pageSize: {
          width: template.width,
          height: template.height,
          dpi: existingPage.dpi,
        },
        templateId: template.id,
        panelMapping,
      },
    };

    // 更新页面
    const page = await prisma.comicPage.update({
      where: { id: params.pageId },
      data: {
        template_id: templateId,
        width: template.width,
        height: template.height,
        canvas_data: canvasData as unknown as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
      include: {
        template: true,
      },
    });

    // 增加模板使用次数
    await prisma.layoutTemplate.update({
      where: { id: templateId },
      data: { use_count: { increment: 1 } },
    });

    return { page: transformComicPage(page), panelSlots };
  });
}
