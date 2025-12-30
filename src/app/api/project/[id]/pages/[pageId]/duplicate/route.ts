/**
 * 页面复制 API
 * POST /api/project/[id]/pages/[pageId]/duplicate - 复制页面
 */

import { prisma } from "@/lib/db";
import { withAuth, ApiError, validateOwnership } from "@/lib/api-helpers";
import { transformComicPage } from "@/lib/layout/transform";

// POST /api/project/[id]/pages/[pageId]/duplicate - 复制页面
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
      throw new ApiError("页面不存在", 404, "NOT_FOUND");
    }

    if (existingPage.project_id !== params.id) {
      throw new ApiError("页面不属于该项目", 400, "INVALID_PAGE");
    }

    // 获取当前最大 page_order
    const maxOrderResult = await prisma.comicPage.aggregate({
      where: { project_id: params.id },
      _max: { page_order: true },
    });

    const newOrder = (maxOrderResult._max.page_order ?? -1) + 1;

    // 复制页面（插入到原页面后面）
    // 首先将后续页面顺序 +1
    await prisma.comicPage.updateMany({
      where: {
        project_id: params.id,
        page_order: { gt: existingPage.page_order },
      },
      data: {
        page_order: { increment: 1 },
      },
    });

    // 创建复制的页面
    const page = await prisma.comicPage.create({
      data: {
        project_id: params.id,
        page_order: existingPage.page_order + 1,
        width: existingPage.width,
        height: existingPage.height,
        dpi: existingPage.dpi,
        preset_name: existingPage.preset_name,
        canvas_data: existingPage.canvas_data ?? undefined,
        template_id: existingPage.template_id,
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
