import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";

/**
 * GET /api/panel/[id]/history
 * 获取分镜的历史生成图片记录
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  return withAuth(async ({ userId }) => {
    const panelId = params.id;

    // 验证分镜权限
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: { project: true },
    });

    if (!panel) {
      throw new Error("分镜不存在");
    }

    if (panel.project.user_id !== userId) {
      const error = new Error("无权限访问此分镜") as Error & { status?: number };
      error.status = 403;
      throw error;
    }

    // 获取历史记录（从 generated_images 表）
    const images = await prisma.generatedImage.findMany({
      where: {
        panel_ids: {
          has: panelId, // 使用 has 操作符检查数组中是否包含 panelId
        },
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        image_url: true,
        created_at: true,
      },
    });

    // 标记当前使用的图片
    const imagesWithStatus = images.map((img) => ({
      ...img,
      is_current: img.image_url === panel.generated_image,
      created_at: img.created_at.toISOString(),
    }));

    return {
      images: imagesWithStatus,
      total: images.length,
    };
  });
}
