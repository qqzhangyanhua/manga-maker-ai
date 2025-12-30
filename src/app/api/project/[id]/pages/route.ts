/**
 * 页面管理 API
 * GET  /api/project/[id]/pages - 获取项目的所有页面
 * POST /api/project/[id]/pages - 创建新页面
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ApiError, validateOwnership } from "@/lib/api-helpers";
import { transformComicPage, transformComicPages } from "@/lib/layout/transform";
import type { CreatePageRequest } from "@/types/layout";

// GET /api/project/[id]/pages - 获取项目的所有页面
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    // 验证项目所有权
    await validateOwnership(prisma.project, params.id, userId, "项目");

    // 获取所有页面
    const pages = await prisma.comicPage.findMany({
      where: { project_id: params.id },
      orderBy: { page_order: "asc" },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    return { pages: transformComicPages(pages) };
  });
}

// POST /api/project/[id]/pages - 创建新页面
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    // 验证项目所有权
    await validateOwnership(prisma.project, params.id, userId, "项目");

    const body: CreatePageRequest = await req.json();
    const { templateId, pageSize, presetName, insertAfterPageId } = body;

    // 获取当前最大 page_order
    const maxOrderResult = await prisma.comicPage.aggregate({
      where: { project_id: params.id },
      _max: { page_order: true },
    });

    let newOrder = (maxOrderResult._max.page_order ?? -1) + 1;

    // 如果指定了 insertAfterPageId，需要重新排序
    if (insertAfterPageId) {
      const afterPage = await prisma.comicPage.findUnique({
        where: { id: insertAfterPageId },
      });

      if (afterPage && afterPage.project_id === params.id) {
        newOrder = afterPage.page_order + 1;

        // 将后面的页面顺序 +1
        await prisma.comicPage.updateMany({
          where: {
            project_id: params.id,
            page_order: { gte: newOrder },
          },
          data: {
            page_order: { increment: 1 },
          },
        });
      }
    }

    // 确定页面尺寸
    let width = 1080;
    let height = 1920;
    let dpi = 72;

    if (pageSize) {
      width = pageSize.width;
      height = pageSize.height;
      dpi = pageSize.dpi;
    } else if (templateId) {
      // 从模板获取尺寸
      const template = await prisma.layoutTemplate.findUnique({
        where: { id: templateId },
      });
      if (template) {
        width = template.width;
        height = template.height;
      }
    }

    // 创建页面
    const page = await prisma.comicPage.create({
      data: {
        project_id: params.id,
        page_order: newOrder,
        width,
        height,
        dpi,
        preset_name: presetName,
        template_id: templateId,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    });

    return { page: transformComicPage(page) };
  });
}
