import type { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "@/lib/api-helpers";
import { anchorTimelineChapters } from "@/lib/project";
import { canvasShotInclude, isUuid, toCanvasShot } from "./shot-mapping";
import type { CanvasPanelRecord } from "./shot-mapping";
import type { CanvasShot } from "./types";
import { PROJECT_REQUIRED_CODE, PROJECT_REQUIRED_MESSAGE } from "./constants";

type Db = PrismaClient | Prisma.TransactionClient;

export { PROJECT_REQUIRED_CODE, PROJECT_REQUIRED_MESSAGE };

export interface CanvasChapterContext {
  timelineChapterId: string;
  timelineId: string;
  novelProjectId: string;
  /** 时间线所属项目；未归属为 null */
  projectId: string | null;
  /** 锚定的项目章节；未锚定或锚点不在时间线所属项目里为 null */
  projectChapterId: string | null;
}

export interface AnchoredCanvasChapter extends CanvasChapterContext {
  projectId: string;
  projectChapterId: string;
}

export interface CanvasShotContext {
  panel: CanvasPanelRecord;
  shot: CanvasShot;
  projectId: string;
  timelineChapterId: string;
  timelineId: string;
  segmentId: string;
}

export function projectRequiredError(): ApiError {
  return new ApiError(PROJECT_REQUIRED_MESSAGE, 409, PROJECT_REQUIRED_CODE);
}

/** 取当前用户的画布章节（时间线章节）；不存在 404，属于他人 403 */
export async function getCanvasChapter(
  db: Db,
  timelineChapterId: string,
  userId: string
): Promise<CanvasChapterContext> {
  const tc = isUuid(timelineChapterId)
    ? await db.timelineChapter.findUnique({
        where: { id: timelineChapterId },
        select: {
          id: true,
          timeline_id: true,
          project_chapter_id: true,
          project_chapter: { select: { project_id: true } },
          timeline: { select: { user_id: true, project_id: true, novel_project_id: true } },
        },
      })
    : null;
  if (!tc) {
    throw new ApiError("章节不存在", 404, "NOT_FOUND");
  }
  if (tc.timeline.user_id !== userId) {
    throw new ApiError("无权操作", 403, "FORBIDDEN");
  }
  const projectId = tc.timeline.project_id;
  return {
    timelineChapterId: tc.id,
    timelineId: tc.timeline_id,
    novelProjectId: tc.timeline.novel_project_id,
    projectId,
    projectChapterId:
      projectId && tc.project_chapter?.project_id === projectId ? tc.project_chapter_id : null,
  };
}

/**
 * 画布读写分镜前，时间线必须已归属项目、章节已锚定到项目章节，否则 409。
 * 已归属但还没锚定的（新加章节等）先补锚定。
 */
export async function requireAnchoredChapter(
  db: PrismaClient,
  chapter: CanvasChapterContext,
  userId: string
): Promise<AnchoredCanvasChapter> {
  if (!chapter.projectId) {
    throw projectRequiredError();
  }
  if (chapter.projectChapterId) {
    return chapter as AnchoredCanvasChapter;
  }
  await anchorTimelineChapters(db, chapter.timelineId);
  const reloaded = await getCanvasChapter(db, chapter.timelineChapterId, userId);
  if (!reloaded.projectId || !reloaded.projectChapterId) {
    throw new ApiError("章节无法对应到漫画项目的章节，请检查来源小说章节是否存在", 409, PROJECT_REQUIRED_CODE);
  }
  return reloaded as AnchoredCanvasChapter;
}

export async function getAnchoredCanvasChapter(
  db: PrismaClient,
  timelineChapterId: string,
  userId: string
): Promise<AnchoredCanvasChapter> {
  return requireAnchoredChapter(db, await getCanvasChapter(db, timelineChapterId, userId), userId);
}

/** 按分镜 ID 取画布上的一格分镜；没有剧本片段的按不存在处理 */
export async function getCanvasShotForUser(db: Db, panelId: string, userId: string): Promise<CanvasShotContext> {
  const panel = isUuid(panelId)
    ? await db.panel.findUnique({
        where: { id: panelId },
        include: {
          ...canvasShotInclude,
          project: { select: { user_id: true } },
          segment: { select: { id: true, timeline_chapter: { select: { id: true, timeline_id: true } } } },
        },
      })
    : null;
  if (!panel || !panel.segment) {
    throw new ApiError("镜头不存在", 404, "NOT_FOUND");
  }
  if (panel.project.user_id !== userId) {
    throw new ApiError("无权操作", 403, "FORBIDDEN");
  }
  return {
    panel,
    shot: toCanvasShot(panel),
    projectId: panel.project_id,
    timelineChapterId: panel.segment.timeline_chapter.id,
    timelineId: panel.segment.timeline_chapter.timeline_id,
    segmentId: panel.segment.id,
  };
}
