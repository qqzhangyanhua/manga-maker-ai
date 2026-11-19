/**
 * POST /api/canvas/timeline/[id]/project
 * 为还没有改编项目的小说新建漫画项目，并让时间线归属该项目、章节锚定到项目章节
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logInfo, logError } from "@/lib/api-logger";
import {
  anchorTimelineChapters,
  ensureNovelAdaptationProject,
  listNovelComicProjects,
} from "@/lib/project";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type CreateResult =
  | { kind: "created"; project: { id: string; title: string }; chaptersCreated: number }
  | { kind: "has_candidates" };

export async function POST(req: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  const userId = payload.userId;
  const { id: timelineId } = await params;

  try {
    const timeline = await prisma.canvasTimeline.findFirst({
      where: { id: timelineId, user_id: userId },
      select: { id: true, project_id: true, novel_project_id: true },
    });
    if (!timeline) {
      return NextResponse.json({ error: "时间线不存在" }, { status: 404 });
    }
    if (timeline.project_id) {
      return NextResponse.json(
        { error: "该画布已归属漫画项目", project_id: timeline.project_id },
        { status: 409 }
      );
    }

    const novel = await prisma.novelProject.findFirst({
      where: { id: timeline.novel_project_id, user_id: userId },
      select: { id: true, title: true, description: true, genre: true },
    });
    if (!novel) {
      return NextResponse.json({ error: "关联小说项目不存在" }, { status: 404 });
    }

    const result = await prisma.$transaction(
      async (tx): Promise<CreateResult> => {
        // 同一部小说并发点击时只建一个项目：加锁后再确认还没有改编项目
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${novel.id}))`;
        const candidates = await listNovelComicProjects(tx, userId, novel.id);
        if (candidates.length > 0) {
          return { kind: "has_candidates" };
        }

        const project = await ensureNovelAdaptationProject(tx, userId, novel);
        await tx.canvasTimeline.update({
          where: { id: timelineId },
          data: { project_id: project.id, updated_at: new Date() },
        });
        const anchor = await anchorTimelineChapters(tx, timelineId);
        return {
          kind: "created",
          project: { id: project.id, title: project.title },
          chaptersCreated: anchor.created,
        };
      },
      { timeout: 30_000 }
    );

    if (result.kind === "has_candidates") {
      return NextResponse.json(
        { error: "这部小说已有漫画项目，请从已有项目中选择归属" },
        { status: 409 }
      );
    }

    logInfo("画布新建漫画项目并归属", {
      endpoint: "/api/canvas/timeline/[id]/project",
      timelineId,
      userId,
      projectId: result.project.id,
      chaptersCreated: result.chaptersCreated,
    });

    return NextResponse.json({
      success: true,
      project: result.project,
      chapters_created: result.chaptersCreated,
    });
  } catch (error) {
    logError("画布新建漫画项目失败", error, {
      endpoint: "/api/canvas/timeline/[id]/project",
      timelineId,
      userId,
    });
    return NextResponse.json({ error: "创建漫画项目失败" }, { status: 500 });
  }
}
