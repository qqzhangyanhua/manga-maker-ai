import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface TimelineAnchorResult {
  /** 本次建立或修正锚定的时间线章节数 */
  anchored: number;
  /** 为此新建的项目章节数 */
  created: number;
  /** 来源小说章节已不存在、无法锚定的时间线章节数 */
  skipped: number;
}

function isClient(db: Db): db is PrismaClient {
  return "$transaction" in db;
}

async function anchorInTx(tx: Prisma.TransactionClient, timelineId: string): Promise<TimelineAnchorResult> {
  const result: TimelineAnchorResult = { anchored: 0, created: 0, skipped: 0 };

  const timeline = await tx.canvasTimeline.findUnique({
    where: { id: timelineId },
    select: { project_id: true },
  });
  const projectId = timeline?.project_id;
  if (!projectId) return result;

  // 没锚定的，以及锚定到其他项目章节的（时间线改过归属）都要重新锚定
  const pending = (
    await tx.timelineChapter.findMany({
      where: { timeline_id: timelineId },
      select: {
        id: true,
        chapter_id: true,
        project_chapter: { select: { project_id: true } },
      },
      orderBy: { chapter_number: "asc" },
    })
  ).filter((tc) => tc.project_chapter?.project_id !== projectId);
  if (pending.length === 0) return result;

  // 与默认章节创建（chapter.ts、数据库触发器）共用锁键，避免并发时为同一小说章节建出两个项目章节
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${projectId}))`;

  const novelChapterIds = Array.from(new Set(pending.map((tc) => tc.chapter_id)));
  const existing = await tx.chapter.findMany({
    where: { project_id: projectId, source_novel_chapter_id: { in: novelChapterIds } },
    select: { id: true, source_novel_chapter_id: true },
    orderBy: [{ chapter_order: "asc" }, { created_at: "asc" }],
  });
  const byNovelChapter = new Map<string, string>();
  for (const chapter of existing) {
    if (chapter.source_novel_chapter_id && !byNovelChapter.has(chapter.source_novel_chapter_id)) {
      byNovelChapter.set(chapter.source_novel_chapter_id, chapter.id);
    }
  }

  const missing = novelChapterIds.filter((id) => !byNovelChapter.has(id));
  if (missing.length > 0) {
    const [project, novelChapters, last] = await Promise.all([
      tx.project.findUnique({ where: { id: projectId }, select: { story_id: true } }),
      tx.novelChapter.findMany({
        where: { id: { in: missing } },
        select: { id: true, chapter_number: true, title: true, outline: true, content: true, is_key_chapter: true },
        orderBy: { chapter_number: "asc" },
      }),
      tx.chapter.findFirst({
        where: { project_id: projectId },
        orderBy: { chapter_order: "desc" },
        select: { chapter_order: true },
      }),
    ]);

    let chapterOrder = (last?.chapter_order ?? 0) + 1;
    for (const novelChapter of novelChapters) {
      const created = await tx.chapter.create({
        data: {
          project_id: projectId,
          // 兼容层：故事主项目的章节仍写 story_id，阶段 6 删除
          story_id: project?.story_id ?? null,
          title: novelChapter.title || `第${novelChapter.chapter_number}章`,
          summary: novelChapter.outline,
          content: novelChapter.content,
          is_key_chapter: novelChapter.is_key_chapter,
          source_novel_chapter_id: novelChapter.id,
          chapter_order: chapterOrder++,
        },
        select: { id: true },
      });
      byNovelChapter.set(novelChapter.id, created.id);
      result.created++;
    }
  }

  for (const tc of pending) {
    const chapterId = byNovelChapter.get(tc.chapter_id);
    if (!chapterId) {
      result.skipped++;
      continue;
    }
    await tx.timelineChapter.update({
      where: { id: tc.id },
      data: { project_chapter_id: chapterId },
    });
    result.anchored++;
  }

  return result;
}

/**
 * 把画布时间线章节锚定到时间线所属项目的章节：按来源小说章节找项目章节，找不到就按小说章节新建。
 * 时间线未归属项目时什么也不做。可重复调用，已正确锚定的章节不会变动。
 */
export async function anchorTimelineChapters(db: Db, timelineId: string): Promise<TimelineAnchorResult> {
  if (isClient(db)) {
    return db.$transaction((tx) => anchorInTx(tx, timelineId));
  }
  return anchorInTx(db, timelineId);
}
