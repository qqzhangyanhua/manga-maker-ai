/**
 * 项目图片聚合 API
 * GET /api/novel/[id]/images
 *
 * 聚合查询项目下所有生成的图片：
 * - 镜头图 (ShotDesign.generated_image_url)
 * - 场景图 (SceneImage.image_url)
 * - 漫画图 (ComicPanelResult.image_url)
 * - 九宫格 (NineGridImage.image_url)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * 图片类型枚举
 */
type ImageType = "shot" | "scene" | "comic" | "nine_grid";

/**
 * 统一图片格式
 */
interface ProjectImage {
  id: string;
  type: ImageType;
  imageUrl: string;
  chapterNumber: number;
  chapterTitle?: string;
  shotOrder?: number;
  createdAt: string;
  metadata: {
    prompt?: string;
    styleId?: string;
    styleName?: string;
    shotSize?: string;
    cameraAngle?: string;
  };
}

/**
 * API 响应类型
 */
interface ProjectImagesResponse {
  images: ProjectImage[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const { searchParams } = new URL(req.url);

  // 解析查询参数
  const type = searchParams.get("type") as ImageType | "all" | null;
  const chapterIdFilter = searchParams.get("chapterId");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  try {
    // 1. 获取项目的所有时间线（一个项目可能有多个时间线）
    const timelines = await prisma.canvasTimeline.findMany({
      where: {
        novel_project_id: projectId,
        user_id: payload.userId,
      },
      select: {
        id: true,
        chapters: {
          select: {
            id: true,
            chapter_id: true,
            chapter_number: true,
          },
          orderBy: { chapter_number: "asc" },
        },
      },
    });

    if (timelines.length === 0) {
      return NextResponse.json({
        images: [],
        total: 0,
        page,
        limit,
        hasMore: false,
      } satisfies ProjectImagesResponse);
    }

    // 合并所有时间线的章节
    const allChapters = timelines.flatMap(t => t.chapters);
    const chapterMap = new Map(
      allChapters.map((c) => [c.id, c])
    );
    const chapterIds = allChapters.map((c) => c.id);

    // 收集所有图片
    const allImages: ProjectImage[] = [];

    // 2. 查询镜头图 (ShotDesign)
    if (!type || type === "all" || type === "shot") {
      const shots = await prisma.shotDesign.findMany({
        where: {
          script_segment: {
            timeline_chapter_id: chapterIdFilter
              ? { equals: chapterIdFilter }
              : { in: chapterIds },
          },
          generated_image_url: { not: null },
        },
        select: {
          id: true,
          shot_order: true,
          generated_image_url: true,
          prompt: true,
          shot_size: true,
          camera_angle: true,
          created_at: true,
          script_segment: {
            select: {
              timeline_chapter_id: true,
            },
          },
        },
        orderBy: [{ created_at: "desc" }],
      });

      for (const shot of shots) {
        const chapter = chapterMap.get(shot.script_segment.timeline_chapter_id);
        if (chapter && shot.generated_image_url) {
          allImages.push({
            id: shot.id,
            type: "shot",
            imageUrl: shot.generated_image_url,
            chapterNumber: chapter.chapter_number,
            shotOrder: shot.shot_order,
            createdAt: shot.created_at.toISOString(),
            metadata: {
              prompt: shot.prompt || undefined,
              shotSize: shot.shot_size,
              cameraAngle: shot.camera_angle,
            },
          });
        }
      }
    }

    // 3. 查询场景图 (SceneImage)
    if (!type || type === "all" || type === "scene") {
      const sceneImages = await prisma.sceneImage.findMany({
        where: {
          shot_design: {
            script_segment: {
              timeline_chapter_id: chapterIdFilter
                ? { equals: chapterIdFilter }
                : { in: chapterIds },
            },
          },
          status: "completed",
        },
        select: {
          id: true,
          image_url: true,
          generation_prompt: true,
          created_at: true,
          shot_design: {
            select: {
              shot_order: true,
              script_segment: {
                select: {
                  timeline_chapter_id: true,
                },
              },
            },
          },
        },
        orderBy: [{ created_at: "desc" }],
      });

      for (const scene of sceneImages) {
        const chapter = chapterMap.get(
          scene.shot_design.script_segment.timeline_chapter_id
        );
        if (chapter) {
          allImages.push({
            id: scene.id,
            type: "scene",
            imageUrl: scene.image_url,
            chapterNumber: chapter.chapter_number,
            shotOrder: scene.shot_design.shot_order,
            createdAt: scene.created_at.toISOString(),
            metadata: {
              prompt: scene.generation_prompt || undefined,
            },
          });
        }
      }
    }

    // 4. 查询漫画图 (ComicPanelResult)
    if (!type || type === "all" || type === "comic") {
      const comicPanels = await prisma.comicPanelResult.findMany({
        where: {
          shot_design: {
            script_segment: {
              timeline_chapter_id: chapterIdFilter
                ? { equals: chapterIdFilter }
                : { in: chapterIds },
            },
          },
          status: "completed",
        },
        select: {
          id: true,
          image_url: true,
          generation_prompt: true,
          created_at: true,
          shot_design: {
            select: {
              shot_order: true,
              script_segment: {
                select: {
                  timeline_chapter_id: true,
                },
              },
            },
          },
        },
        orderBy: [{ created_at: "desc" }],
      });

      for (const panel of comicPanels) {
        const chapter = chapterMap.get(
          panel.shot_design.script_segment.timeline_chapter_id
        );
        if (chapter) {
          allImages.push({
            id: panel.id,
            type: "comic",
            imageUrl: panel.image_url,
            chapterNumber: chapter.chapter_number,
            shotOrder: panel.shot_design.shot_order,
            createdAt: panel.created_at.toISOString(),
            metadata: {
              prompt: panel.generation_prompt || undefined,
            },
          });
        }
      }
    }

    // 5. 查询九宫格 (NineGridImage)
    if (!type || type === "all" || type === "nine_grid") {
      // 获取 chapter_id 列表（注意：NineGridImage 使用的是 NovelChapter 的 ID）
      const novelChapterIds = allChapters.map((c) => c.chapter_id).filter(Boolean) as string[];

      // 🔍 调试日志
      console.log("\n" + "=".repeat(60));
      console.log("[ProjectImages] 九宫格查询调试信息");
      console.log("=".repeat(60));
      console.log("项目ID (projectId):", projectId);
      console.log("时间线数量:", timelines.length);
      console.log("时间线IDs:", timelines.map(t => t.id));
      console.log("用户ID:", payload.userId);
      console.log("所有时间线章节总数:", allChapters.length);
      console.log("时间线章节详情:", allChapters.map(c => ({
        timelineChapterId: c.id,
        novelChapterId: c.chapter_id || "NULL ⚠️",
        chapterNumber: c.chapter_number,
      })));
      console.log("用于查询的 novelChapterIds:", novelChapterIds);
      console.log("过滤条件 chapterIdFilter:", chapterIdFilter || "无");

      const nineGridImages = await prisma.nineGridImage.findMany({
        where: {
          user_id: payload.userId,
          chapter_id: chapterIdFilter
            ? { equals: chapterIdFilter }
            : { in: novelChapterIds },
        },
        select: {
          id: true,
          image_url: true,
          prompt_combined: true,
          chapter_id: true,
          created_at: true,
        },
        orderBy: [{ created_at: "desc" }],
      });

      console.log("查询到的九宫格图片数量:", nineGridImages.length);
      if (nineGridImages.length > 0) {
        console.log("九宫格图片详情:", nineGridImages.map(g => ({
          id: g.id,
          chapter_id: g.chapter_id,
          created_at: g.created_at,
        })));
      }

      // 额外查询：不带 chapter_id 过滤，看看数据库里到底有多少九宫格图片
      const allUserNineGrids = await prisma.nineGridImage.findMany({
        where: { user_id: payload.userId },
        select: { id: true, chapter_id: true, created_at: true },
        orderBy: [{ created_at: "desc" }],
        take: 10,
      });
      console.log("该用户所有九宫格图片(最近10条):", allUserNineGrids.map(g => ({
        id: g.id,
        chapter_id: g.chapter_id || "NULL ⚠️",
        created_at: g.created_at.toISOString(),
      })));
      console.log("=".repeat(60) + "\n");

      // 创建 chapter_id → chapter_number 映射
      const novelChapterMap = new Map(
        allChapters.map((c) => [c.chapter_id, c.chapter_number])
      );

      for (const grid of nineGridImages) {
        const chapterNumber = novelChapterMap.get(grid.chapter_id);
        if (chapterNumber !== undefined) {
          allImages.push({
            id: grid.id,
            type: "nine_grid",
            imageUrl: grid.image_url,
            chapterNumber,
            createdAt: grid.created_at.toISOString(),
            metadata: {
              prompt: grid.prompt_combined || undefined,
            },
          });
        }
      }
    }

    // 6. 按时间排序
    allImages.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 7. 分页
    const total = allImages.length;
    const paginatedImages = allImages.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return NextResponse.json({
      images: paginatedImages,
      total,
      page,
      limit,
      hasMore,
    } satisfies ProjectImagesResponse);
  } catch (error) {
    console.error("[ProjectImages] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "查询图片失败",
      },
      { status: 500 }
    );
  }
}
