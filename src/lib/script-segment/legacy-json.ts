import type { Prisma, PrismaClient } from "@prisma/client";

import { ensureDefaultChapter } from "@/lib/project/chapter";

type Db = PrismaClient | Prisma.TransactionClient;

/** 章节上的一则剧本片段。快照、恢复和导出都用这个形状，不使用项目级 JSON。 */
export interface ChapterSegmentRecord {
  id: string;
  chapter_id: string;
  segment_order: number;
  content: string;
  source_text_start: number;
  source_text_end: number;
}

interface LegacyJsonSegment {
  id: string;
  text: string;
  start: number;
  end: number;
}

interface ProjectPanelRow {
  id: string;
  chapter_id: string;
  script_segment_id: string | null;
  segment_id: string | null;
}

interface ExistingSegmentRow {
  id: string;
  chapter_id: string | null;
  content: string;
  source_text_start: number;
  source_text_end: number;
  segment_order: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 分镜面板用的片段名单：来自章节上的行，不是项目级 JSON。 */
export function toStoryboardPanelSegments(rows: ChapterSegmentRecord[]) {
  return rows.map((row) => ({
    id: row.id,
    text: row.content,
    start: row.source_text_start,
    end: row.source_text_end,
  }));
}

/** 迁移可能刚改过 segment_id。调用方手里的分镜还是旧对象时，用这次读到的值盖回去。 */
export async function readMigratedPanelSegmentIds(db: Db, projectId: string): Promise<Map<string, string | null>> {
  const panels = await db.panel.findMany({
    where: { project_id: projectId },
    select: { id: true, segment_id: true },
  });
  return new Map(panels.map((panel) => [panel.id, panel.segment_id]));
}

export function withMigratedSegmentIds<T extends { id: string; segment_id: string | null }>(
  panels: T[],
  segmentIds: ReadonlyMap<string, string | null>,
): T[] {
  return panels.map((panel) => {
    if (!segmentIds.has(panel.id)) return panel;
    const segmentId = segmentIds.get(panel.id) ?? null;
    if (segmentId === panel.segment_id) return panel;
    return { ...panel, segment_id: segmentId };
  });
}

/**
 * 读出版本里的剧本片段。新快照是章节行；旧快照是 { id, text, start, end }。
 * 没有章节 id 的旧片段，恢复时落到项目的默认章节。
 */
export function readSnapshotSegments(value: unknown): ChapterSegmentRecord[] {
  if (!Array.isArray(value)) return [];
  const records: ChapterSegmentRecord[] = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const content = typeof row.content === "string"
      ? row.content
      : typeof row.text === "string"
        ? row.text
        : null;
    if (content === null) return;
    const id = typeof row.id === "string" && row.id.length > 0 ? row.id : `restored-${index + 1}`;
    records.push({
      id,
      chapter_id: typeof row.chapter_id === "string" ? row.chapter_id : "",
      segment_order: typeof row.segment_order === "number" ? row.segment_order : index + 1,
      content,
      source_text_start: typeof row.source_text_start === "number"
        ? row.source_text_start
        : typeof row.start === "number"
          ? row.start
          : 0,
      source_text_end: typeof row.source_text_end === "number"
        ? row.source_text_end
        : typeof row.end === "number"
          ? row.end
          : 0,
    });
  });
  return records;
}

/** 先迁旧 JSON，再按章节顺序读出剧本片段。快照和导出都走这里。 */
export async function readProjectChapterSegments(db: Db, projectId: string): Promise<ChapterSegmentRecord[]> {
  await migrateLegacyJsonSegments(db, projectId);
  const chapters = await listProjectChapters(db, projectId);
  if (chapters.length === 0) return [];
  const rows = await db.scriptSegment.findMany({
    where: { chapter_id: { in: chapters.map((item) => item.id) } },
    select: {
      id: true,
      chapter_id: true,
      segment_order: true,
      content: true,
      source_text_start: true,
      source_text_end: true,
    },
  });
  const chapterIndex = new Map(chapters.map((item, index) => [item.id, index]));
  return rows
    .flatMap((row) => {
      if (!row.chapter_id) return [];
      return [{
        id: row.id,
        chapter_id: row.chapter_id,
        segment_order: row.segment_order,
        content: row.content,
        source_text_start: row.source_text_start,
        source_text_end: row.source_text_end,
      }];
    })
    .sort((left, right) => {
      const chapterDiff = (chapterIndex.get(left.chapter_id) ?? 0) - (chapterIndex.get(right.chapter_id) ?? 0);
      if (chapterDiff !== 0) return chapterDiff;
      return left.segment_order - right.segment_order;
    });
}

/**
 * 用快照里的章节剧本片段替换项目现有的行。
 * 章节已经不在项目里时，放到默认章节。不把片段名单写进项目级 JSON。
 * 调用方要先删掉分镜，避免删除旧行时级联删掉分镜。
 */
export async function restoreProjectChapterSegments(
  db: Db,
  projectId: string,
  segments: ChapterSegmentRecord[],
): Promise<ChapterSegmentRecord[]> {
  const chapters = await listProjectChapters(db, projectId);
  const chapterIds = new Set(chapters.map((item) => item.id));
  let fallbackChapterId = chapters[0]?.id ?? null;
  const existing = chapterIds.size === 0
    ? []
    : await db.scriptSegment.findMany({
        where: { chapter_id: { in: [...chapterIds] } },
        select: { id: true },
      });
  if (existing.length > 0) {
    await db.scriptSegment.deleteMany({ where: { id: { in: existing.map((item) => item.id) } } });
  }

  const written: ChapterSegmentRecord[] = [];
  for (const segment of segments) {
    let chapterId = segment.chapter_id;
    if (!chapterIds.has(chapterId)) {
      if (!fallbackChapterId) {
        fallbackChapterId = await ensureDefaultChapter(db, projectId);
      }
      chapterIds.add(fallbackChapterId);
      chapterId = fallbackChapterId;
    }
    const created = await db.scriptSegment.create({
      data: {
        ...(UUID_PATTERN.test(segment.id) ? { id: segment.id } : {}),
        timeline_chapter_id: null,
        chapter_id: chapterId,
        segment_order: segment.segment_order,
        content: segment.content,
        scene_description: segment.content,
        character_actions: "",
        dialogue: null,
        estimated_duration: 0,
        emotion_tone: "",
        source_text_start: segment.source_text_start,
        source_text_end: segment.source_text_end,
      },
    });
    written.push({
      id: created.id,
      chapter_id: chapterId,
      segment_order: created.segment_order,
      content: created.content,
      source_text_start: created.source_text_start,
      source_text_end: created.source_text_end,
    });
  }

  const script = await db.storyScript.findUnique({ where: { project_id: projectId } });
  if (script && Array.isArray(script.segments) && script.segments.length > 0) {
    await db.storyScript.update({
      where: { project_id: projectId },
      data: { segments: [] },
    });
  }
  return written;
}

/**
 * 把项目级 JSON 剧本片段迁到章节上。
 * 被分镜用字符串片段 id 指到的，迁到那些分镜所在的章节，分镜改为指向新行。
 * 迁完后 JSON 名单清空，列还留在库里。不写分镜上的字符串片段 id。
 */
export async function migrateLegacyJsonSegments(db: Db, projectId: string): Promise<void> {
  const script = await db.storyScript.findUnique({ where: { project_id: projectId } });
  const jsonSegments = readLegacyJsonSegments(script?.segments);
  if (jsonSegments.length === 0) return;

  const panels = await db.panel.findMany({
    where: { project_id: projectId },
    select: { id: true, chapter_id: true, script_segment_id: true, segment_id: true },
  });
  const chapters = await listProjectChapters(db, projectId);
  let firstChapterId = chapters[0]?.id ?? null;
  const existing = await db.scriptSegment.findMany({
    where: { chapter_id: { in: chapters.map((item) => item.id) } },
    select: {
      id: true,
      chapter_id: true,
      content: true,
      source_text_start: true,
      source_text_end: true,
      segment_order: true,
    },
  });

  const rows: ExistingSegmentRow[] = existing.map((row) => ({ ...row }));
  const nextOrder = new Map<string, number>();
  for (const row of rows) {
    if (!row.chapter_id) continue;
    nextOrder.set(row.chapter_id, Math.max(nextOrder.get(row.chapter_id) ?? 0, row.segment_order));
  }

  for (const jsonSegment of jsonSegments) {
    const referenced = panels.filter((panel) => panelReferences(panel, jsonSegment.id));
    const existingById = rows.find((row) => row.id === jsonSegment.id);
    if (existingById) {
      for (const panel of referenced) {
        if (panel.segment_id === existingById.id) continue;
        await db.panel.update({
          where: { id: panel.id },
          data: { segment_id: existingById.id },
        });
        panel.segment_id = existingById.id;
      }
      continue;
    }
    const referencedChapters = unique(referenced.map((panel) => panel.chapter_id));
    if (referencedChapters.length === 0 && !firstChapterId) {
      firstChapterId = await ensureDefaultChapter(db, projectId);
    }
    const chapterIds = referencedChapters.length > 0 ? referencedChapters : firstChapterId ? [firstChapterId] : [];
    for (const chapterId of chapterIds) {
      const reused = rows.find((row) => sameChapterSegment(row, chapterId, jsonSegment));
      const segmentId = reused?.id ?? (await createMigratedSegment(db, chapterId, jsonSegment, takeNextOrder(nextOrder, chapterId), rows));
      for (const panel of referenced) {
        if (panel.chapter_id !== chapterId || panel.segment_id === segmentId) continue;
        await db.panel.update({
          where: { id: panel.id },
          data: { segment_id: segmentId },
        });
        panel.segment_id = segmentId;
      }
    }
  }

  await db.storyScript.update({
    where: { project_id: projectId },
    data: { segments: [] },
  });
}

async function listProjectChapters(db: Db, projectId: string) {
  const chapters = await db.chapter.findMany({
    where: { project_id: projectId },
    select: { id: true, chapter_order: true, created_at: true },
  });
  return [...chapters].sort((left, right) => {
    if (left.chapter_order !== right.chapter_order) return left.chapter_order - right.chapter_order;
    return left.created_at.getTime() - right.created_at.getTime();
  });
}

function readLegacyJsonSegments(value: unknown): LegacyJsonSegment[] {
  if (!Array.isArray(value)) return [];
  const segments: LegacyJsonSegment[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || row.id.length === 0) continue;
    if (typeof row.text !== "string") continue;
    segments.push({
      id: row.id,
      text: row.text,
      start: typeof row.start === "number" ? row.start : 0,
      end: typeof row.end === "number" ? row.end : 0,
    });
  }
  return segments;
}

function sameChapterSegment(row: ExistingSegmentRow, chapterId: string, jsonSegment: LegacyJsonSegment): boolean {
  if (row.chapter_id !== chapterId) return false;
  if (row.id === jsonSegment.id) return true;
  return row.content === jsonSegment.text
    && row.source_text_start === jsonSegment.start
    && row.source_text_end === jsonSegment.end;
}

async function createMigratedSegment(
  db: Db,
  chapterId: string,
  jsonSegment: LegacyJsonSegment,
  segmentOrder: number,
  rows: ExistingSegmentRow[],
): Promise<string> {
  const created = await db.scriptSegment.create({
    data: {
      timeline_chapter_id: null,
      chapter_id: chapterId,
      segment_order: segmentOrder,
      content: jsonSegment.text,
      scene_description: jsonSegment.text,
      character_actions: "",
      dialogue: null,
      estimated_duration: 0,
      emotion_tone: "",
      source_text_start: jsonSegment.start,
      source_text_end: jsonSegment.end,
    },
  });
  rows.push({
    id: created.id,
    chapter_id: created.chapter_id,
    content: created.content,
    source_text_start: created.source_text_start,
    source_text_end: created.source_text_end,
    segment_order: created.segment_order,
  });
  return created.id;
}

function panelReferences(panel: ProjectPanelRow, legacyId: string): boolean {
  return panel.script_segment_id === legacyId || panel.segment_id === legacyId;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function takeNextOrder(nextOrder: Map<string, number>, chapterId: string): number {
  const order = (nextOrder.get(chapterId) ?? 0) + 1;
  nextOrder.set(chapterId, order);
  return order;
}
