/**
 * 单个页面操作 API
 * GET    /api/project/[id]/pages/[pageId] - 获取页面详情
 * PATCH  /api/project/[id]/pages/[pageId] - 更新页面
 * DELETE /api/project/[id]/pages/[pageId] - 删除页面
 */

import { prisma } from "@/lib/db";
import { withAuth, ApiError, validateOwnership } from "@/lib/api-helpers";
import { transformComicPage } from "@/lib/layout/transform";
import type { UpdatePageRequest } from "@/types/layout";
import type { Prisma } from "@prisma/client";

// GET /api/project/[id]/pages/[pageId] - 获取页面详情
export async function GET(
  req: Request,
  { params }: { params: { id: string; pageId: string } }
) {
  return withAuth(async ({ userId }) => {
    // 验证项目所有权
    await validateOwnership(prisma.project, params.id, userId, "项目");

    const page = await prisma.comicPage.findUnique({
      where: { id: params.pageId },
      include: {
        template: true,
      },
    });

    if (!page) {
      throw new ApiError("页面不存在", 404, "NOT_FOUND");
    }

    if (page.project_id !== params.id) {
      throw new ApiError("页面不属于该项目", 400, "INVALID_PAGE");
    }

    return { page: transformComicPage(page) };
  });
}

// PATCH /api/project/[id]/pages/[pageId] - 更新页面
export async function PATCH(
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
      throw new ApiError("页面不存在", 404, "NOT_FOUND");
    }

    if (existingPage.project_id !== params.id) {
      throw new ApiError("页面不属于该项目", 400, "INVALID_PAGE");
    }

    const body: UpdatePageRequest = await req.json();
    const { canvasData, pageOrder, thumbnailUrl } = body;

    // 构建更新数据
    const updateData: Prisma.ComicPageUpdateInput = {
      updated_at: new Date(),
    };

    if (canvasData !== undefined) {
      updateData.canvas_data = canvasData as unknown as Prisma.InputJsonValue;
    }

    if (thumbnailUrl !== undefined) {
      updateData.thumbnail_url = thumbnailUrl;
    }

    // 如果更新 pageOrder，需要处理其他页面的顺序
    if (pageOrder !== undefined && pageOrder !== existingPage.page_order) {
      const oldOrder = existingPage.page_order;
      const newOrder = pageOrder;

      if (newOrder > oldOrder) {
        // 向后移动：将 (oldOrder, newOrder] 范围内的页面 -1
        await prisma.comicPage.updateMany({
          where: {
            project_id: params.id,
            page_order: {
              gt: oldOrder,
              lte: newOrder,
            },
          },
          data: {
            page_order: { decrement: 1 },
          },
        });
      } else {
        // 向前移动：将 [newOrder, oldOrder) 范围内的页面 +1
        await prisma.comicPage.updateMany({
          where: {
            project_id: params.id,
            page_order: {
              gte: newOrder,
              lt: oldOrder,
            },
          },
          data: {
            page_order: { increment: 1 },
          },
        });
      }

      updateData.page_order = newOrder;
    }

    const page = await prisma.comicPage.update({
      where: { id: params.pageId },
      data: updateData,
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

// DELETE /api/project/[id]/pages/[pageId] - 删除页面
export async function DELETE(
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
      throw new ApiError("页面不存在", 404, "NOT_FOUND");
    }

    if (existingPage.project_id !== params.id) {
      throw new ApiError("页面不属于该项目", 400, "INVALID_PAGE");
    }

    // 删除页面
    await prisma.comicPage.delete({
      where: { id: params.pageId },
    });

    // 重新排序后续页面
    await prisma.comicPage.updateMany({
      where: {
        project_id: params.id,
        page_order: { gt: existingPage.page_order },
      },
      data: {
        page_order: { decrement: 1 },
      },
    });

    return { success: true };
  });
}
