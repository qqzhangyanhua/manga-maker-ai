/**
 * 页面重排序 API
 * POST /api/project/[id]/pages/reorder - 批量重排序页面
 */

import { prisma } from "@/lib/db";
import { withAuth, ApiError, validateOwnership } from "@/lib/api-helpers";
import { transformComicPages } from "@/lib/layout/transform";
import type { ReorderPagesRequest } from "@/types/layout";

// POST /api/project/[id]/pages/reorder - 批量重排序页面
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    // 验证项目所有权
    await validateOwnership(prisma.project, params.id, userId, "项目");

    const body: ReorderPagesRequest = await req.json();
    const { pageIds } = body;

    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      throw new ApiError(400, "INVALID_INPUT", "pageIds 必须是非空数组");
    }

    // 验证所有页面都属于该项目
    const existingPages = await prisma.comicPage.findMany({
      where: {
        project_id: params.id,
      },
      select: { id: true },
    });

    const existingPageIds = new Set(existingPages.map((p) => p.id));
    const invalidIds = pageIds.filter((id) => !existingPageIds.has(id));

    if (invalidIds.length > 0) {
      throw new ApiError(
        400, "INVALID_PAGE_IDS", `以下页面不存在或不属于该项目: ${invalidIds.join(", ")}`
      );
    }

    // 批量更新页面顺序
    await prisma.$transaction(
      pageIds.map((pageId, index) =>
        prisma.comicPage.update({
          where: { id: pageId },
          data: { page_order: index, updated_at: new Date() },
        })
      )
    );

    // 获取更新后的页面列表
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
