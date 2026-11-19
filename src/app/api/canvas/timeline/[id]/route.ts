/**
 * Canvas Timeline Detail API
 * GET /api/canvas/timeline/[id] - 获取时间线详情（支持分页窗口）
 * PATCH /api/canvas/timeline/[id] - 更新时间线配置
 * DELETE /api/canvas/timeline/[id] - 删除时间线
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import { UpdateTimelineConfigRequestSchema } from "@/lib/api-schemas/canvas.schemas";
import { anchorTimelineChapters, listNovelComicProjects } from "@/lib/project";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const DEFAULT_WINDOW_RANGE = 2;
const MAX_WINDOW_RANGE = 5;

export async function GET(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id } = await params;

  const url = new URL(req.url);
  const centerParam = url.searchParams.get("center");
  const rangeParam = url.searchParams.get("range");

  const range = Math.min(
    parseInt(rangeParam || String(DEFAULT_WINDOW_RANGE), 10),
    MAX_WINDOW_RANGE
  );

  try {
    const timeline = await prisma.canvasTimeline.findFirst({
      where: {
        id,
        user_id: payload.userId,
      },
      include: {
        chapters: {
          orderBy: { chapter_number: "asc" },
          select: {
            id: true,
            chapter_number: true,
            script_status: true,
            shot_status: true,
            final_status: true,
          },
        },
      },
    });

    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }

    // 时间线未归属漫画项目时，列出候选项目供画布界面选择
    const candidateProjects = timeline.project_id
      ? []
      : await listNovelComicProjects(prisma, payload.userId, timeline.novel_project_id);

    const totalChapters = timeline.chapters.length;

    if (totalChapters === 0) {
      return NextResponse.json({
        success: true,
        timeline: {
          ...timeline,
          candidate_projects: candidateProjects,
          chapter_summaries: [],
          chapters: [],
          window: {
            center: 1,
            range,
            start: 1,
            end: 1,
            total: 0,
            hasMore: { prev: false, next: false },
          },
        },
      });
    }

    const center = centerParam
      ? Math.max(1, Math.min(parseInt(centerParam, 10), totalChapters))
      : 1;

    const windowStart = Math.max(1, center - range);
    const windowEnd = Math.min(totalChapters, center + range);

    const windowChapters = await prisma.timelineChapter.findMany({
      where: {
        timeline_id: id,
        chapter_number: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      orderBy: { chapter_number: "asc" },
    });

    const response = {
      id: timeline.id,
      novel_project_id: timeline.novel_project_id,
      project_id: timeline.project_id,
      candidate_projects: candidateProjects,
      user_id: timeline.user_id,
      title: timeline.title,
      status: timeline.status,
      config: timeline.config,
      total_chapters: timeline.total_chapters,
      completed_chapters: timeline.completed_chapters,
      total_shots: timeline.total_shots,
      total_images: timeline.total_images,
      created_at: timeline.created_at.toISOString(),
      updated_at: timeline.updated_at.toISOString(),
      chapter_summaries: timeline.chapters.map((ch) => ({
        id: ch.id,
        chapter_number: ch.chapter_number,
        script_status: ch.script_status,
        shot_status: ch.shot_status,
        final_status: ch.final_status,
      })),
      chapters: windowChapters.map((ch) => ({
        id: ch.id,
        timeline_id: ch.timeline_id,
        chapter_number: ch.chapter_number,
        script_status: ch.script_status,
        shot_status: ch.shot_status,
        final_status: ch.final_status,
        script_segment_count: ch.script_segment_count,
        shot_count: ch.shot_count,
        final_image_count: ch.final_image_count,
        created_at: ch.created_at.toISOString(),
        updated_at: ch.updated_at.toISOString(),
      })),
      window: {
        center,
        range,
        start: windowStart,
        end: windowEnd,
        total: totalChapters,
        hasMore: {
          prev: windowStart > 1,
          next: windowEnd < totalChapters,
        },
      },
    };

    return NextResponse.json({ success: true, timeline: response });
  } catch (error) {
    console.error("获取时间线详情失败:", error);
    return NextResponse.json({ error: "获取时间线详情失败" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    // Validate request body with Zod schema
    const validation = UpdateTimelineConfigRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "请求参数验证失败",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { title, config, status, project_id } = validation.data;

    logInfo("更新时间线配置", {
      endpoint: "/api/canvas/timeline/[id]",
      timelineId: id,
      userId: payload.userId,
      hasConfig: !!config,
      hasTitle: !!title,
    });

    // Verify user owns this timeline
    const timeline = await prisma.canvasTimeline.findFirst({
      where: { id, user_id: payload.userId },
    });

    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }

    // 归属项目校验：必须是当前用户的、且以该小说为来源的漫画项目
    if (project_id) {
      const project = await prisma.project.findFirst({
        where: { id: project_id, user_id: payload.userId },
        select: { source_novel_id: true },
      });
      if (!project) {
        return NextResponse.json({ error: "项目不存在" }, { status: 404 });
      }
      if (project.source_novel_id !== timeline.novel_project_id) {
        return NextResponse.json(
          { error: "该项目不是该小说的改编项目" },
          { status: 400 }
        );
      }
    }

    // If updating comic style, verify it exists
    if (config?.default_comic_style_id !== undefined) {
      if (config.default_comic_style_id !== null) {
        const styleExists = await prisma.comicStyle.findFirst({
          where: {
            id: config.default_comic_style_id,
            enabled: true,
          },
        });

        if (!styleExists) {
          return NextResponse.json(
            { error: "指定的漫画风格不存在或已禁用" },
            { status: 400 }
          );
        }
      }
    }

    // Merge config with existing config (partial update)
    const existingConfig = timeline.config as Record<string, unknown> || {};
    const updatedConfig = config ? { ...existingConfig, ...config } : undefined;

    const updated = await prisma.canvasTimeline.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(updatedConfig && { config: updatedConfig }),
        ...(status && { status }),
        ...(project_id !== undefined && { project_id }),
        updated_at: new Date(),
      },
    });

    if (project_id) {
      const anchor = await anchorTimelineChapters(prisma, id);
      logInfo("时间线章节锚定项目章节", { timelineId: id, projectId: project_id, ...anchor });
    }

    logInfo("时间线配置更新成功", {
      timelineId: id,
      userId: payload.userId,
    });

    return NextResponse.json({ success: true, timeline: updated });
  } catch (error) {
    logError("更新时间线失败", error, {
      timelineId: id,
      userId: payload.userId,
    });
    return NextResponse.json({ error: "更新时间线失败" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const timeline = await prisma.canvasTimeline.findFirst({
      where: { id, user_id: payload.userId },
    });

    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }

    await prisma.canvasTimeline.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "时间线已删除" });
  } catch (error) {
    console.error("删除时间线失败:", error);
    return NextResponse.json({ error: "删除时间线失败" }, { status: 500 });
  }
}
