import type { Prisma, PrismaClient, ScriptSegment } from "@prisma/client";
import { panelReadingOrderBy } from "@/lib/project";
import { panels, type NewPanelInput } from "@/lib/project/chapter-panels";

type Db = PrismaClient | Prisma.TransactionClient;

/** 画布分析给出的一则剧本片段。章节 id 由 module 写入，不由调用方另填。 */
export interface ScriptSegmentDraft {
  segment_order: number;
  content: string;
  scene_description: string;
  character_actions: string;
  dialogue: string | null;
  estimated_duration: number;
  emotion_tone: string;
  source_text_start: number;
  source_text_end: number;
}

/** 分镜生成里，模型用字符串把格子对上片段。这个字符串只用于本次对照，不写入分镜。 */
export interface StoryboardSegmentDraft {
  sourceKey: string;
  content: string;
  start: number;
  end: number;
}

export interface StoryboardPanelDraft {
  sourceKey: string | null;
  panel_order: number;
  panel_type: string;
  importance: string;
  description: string;
  dialogue: string | null;
  character_id: string | null;
  character_name: string | null;
  emotion: string | null;
  prompt_used: string | null;
  script_start: number | null;
  script_end: number | null;
  camera_angle: string | null;
  shot_size: string | null;
  visual_prompt: string | null;
}

export interface WrittenStoryboardSegment {
  id: string;
  chapter_id: string | null;
  content: string;
  source_text_start: number;
  source_text_end: number;
  sourceKey: string | null;
}

export interface StoryboardChapterWrite {
  segments: WrittenStoryboardSegment[];
  panels: Array<{ id: string; segment_id: string | null }>;
}

export interface MergedPanelDraft {
  panel_type: string;
  importance: string;
  description: string;
  visual_prompt: string | null;
  prompt_used: string | null;
  dialogue: string | null;
  emotion: string | null;
  camera_angle: string | null;
  shot_size: string | null;
}

interface CreateChapterSegmentsInput {
  chapterId: string;
  timelineChapterId?: string | null;
  segments: ScriptSegmentDraft[];
}

interface StoryboardChapterInput {
  projectId: string;
  chapterId: string;
  segments: StoryboardSegmentDraft[];
  panels: StoryboardPanelDraft[];
}

interface MergePanelsInput {
  projectId: string;
  panelIds: string[];
  panel: MergedPanelDraft;
}

export function readStoryboardSegments(value: unknown): StoryboardSegmentDraft[] {
  if (!Array.isArray(value)) return [];
  const drafts: StoryboardSegmentDraft[] = [];
  value.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const sourceKey = typeof row.id === "string" && row.id.length > 0 ? row.id : `seg_${index + 1}`;
    const content = typeof row.text === "string" ? row.text : "";
    const start = typeof row.start === "number" ? row.start : 0;
    const end = typeof row.end === "number" ? row.end : content.length;
    drafts.push({ sourceKey, content, start, end });
  });
  return drafts;
}

/**
 * 把剧本片段写到一章。
 * 没有时间线时，章节 id 就是传入的这一章。
 * 有时间线时，章节 id 改成该时间线的项目章节锚点，锚点为空就写下空。
 */
export async function createChapterScriptSegments(
  db: Db,
  input: CreateChapterSegmentsInput
): Promise<ScriptSegment[]> {
  const placed = await chapterForSegments(db, input.chapterId, input.timelineChapterId);
  const written: ScriptSegment[] = [];
  for (const segment of input.segments) {
    const created = await db.scriptSegment.create({
      data: {
        timeline_chapter_id: placed.timelineChapterId,
        chapter_id: placed.chapterId,
        segment_order: segment.segment_order,
        content: segment.content,
        scene_description: segment.scene_description,
        character_actions: segment.character_actions,
        dialogue: segment.dialogue,
        estimated_duration: segment.estimated_duration,
        emotion_tone: segment.emotion_tone,
        source_text_start: segment.source_text_start,
        source_text_end: segment.source_text_end,
      },
    });
    written.push(created);
  }
  return written;
}

/** 分镜生成：片段属于这一章，分镜只指向剧本片段 id。 */
export async function writeStoryboardOnChapter(
  db: Db,
  input: StoryboardChapterInput
): Promise<StoryboardChapterWrite> {
  const createdSegments = await createChapterScriptSegments(db, {
    chapterId: input.chapterId,
    segments: input.segments.map((segment, index) => ({
      segment_order: index + 1,
      content: segment.content,
      scene_description: segment.content,
      character_actions: "",
      dialogue: null,
      estimated_duration: 0,
      emotion_tone: "",
      source_text_start: segment.start,
      source_text_end: segment.end,
    })),
  });

  const segmentIdByKey = new Map<string, string>();
  input.segments.forEach((segment, index) => {
    const row = createdSegments[index];
    if (row && !segmentIdByKey.has(segment.sourceKey)) {
      segmentIdByKey.set(segment.sourceKey, row.id);
    }
  });

  const ordered = [...input.panels].sort((left, right) => left.panel_order - right.panel_order);
  const writer = chapterPanels(db, input.projectId);
  const createdPanels = await writer.add(
    ordered.map((panel) => ({
      segmentId: panel.sourceKey ? segmentIdByKey.get(panel.sourceKey) ?? null : null,
      panelType: panel.panel_type,
      importance: panel.importance,
      description: panel.description,
      dialogue: panel.dialogue,
      characterName: panel.character_name,
      emotion: panel.emotion,
      promptUsed: panel.prompt_used,
      scriptStart: panel.script_start,
      scriptEnd: panel.script_end,
      cameraAngle: panel.camera_angle,
      shotSize: panel.shot_size,
      visualPrompt: panel.visual_prompt,
    })),
    { chapter: input.chapterId },
  );

  const libraryIds = ordered
    .map((panel) => panel.character_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  if (libraryIds.length > 0) {
    const projectCharacters = await db.projectCharacter.findMany({
      where: { project_id: input.projectId, character_id: { in: libraryIds } },
      select: { id: true, character_id: true },
    });
    const byLibrary = new Map(projectCharacters.map((row) => [row.character_id, row.id]));
    for (let index = 0; index < ordered.length; index += 1) {
      const libraryId = ordered[index]?.character_id;
      const panelId = createdPanels[index]?.id;
      if (!libraryId || !panelId) continue;
      const projectCharacterId = byLibrary.get(libraryId);
      if (!projectCharacterId) continue;
      await writer.setLead([panelId], projectCharacterId);
    }
  }

  const panels = createdPanels.map((panel, index) => {
    const sourceKey = ordered[index]?.sourceKey;
    return {
      id: panel.id,
      segment_id: sourceKey ? segmentIdByKey.get(sourceKey) ?? null : null,
    };
  });

  return {
    segments: createdSegments.map((row, index) => ({
      id: row.id,
      chapter_id: row.chapter_id,
      content: row.content,
      source_text_start: row.source_text_start,
      source_text_end: row.source_text_end,
      sourceKey: input.segments[index]?.sourceKey ?? null,
    })),
    panels,
  };
}

/** 合并后的分镜留下顺序靠前那一格的剧本片段。在场角色由分镜模块取并集，这里不写主角色。 */
export async function mergePanelsKeepingSegment(db: Db, input: MergePanelsInput) {
  const found = await db.panel.findMany({
    where: { id: { in: input.panelIds }, project_id: input.projectId },
    orderBy: panelReadingOrderBy,
  });
  const earlier = found[0];
  const later = found[1];
  if (found.length !== 2 || !earlier || !later) {
    throw new Error("分镜不存在或不属于该项目");
  }
  const fields: Partial<NewPanelInput> = {
    panelType: input.panel.panel_type,
    importance: input.panel.importance,
    description: input.panel.description,
    visualPrompt: input.panel.visual_prompt,
    promptUsed: input.panel.prompt_used,
    dialogue: input.panel.dialogue,
    emotion: input.panel.emotion,
    cameraAngle: input.panel.camera_angle,
    shotSize: input.panel.shot_size,
    segmentId: earlier.segment_id,
    scriptStart: earlier.script_start,
    scriptEnd: later.script_end,
  };
  const merged = await mergeThroughPanels(db, input.projectId, input.panelIds, fields);
  const row = await db.panel.findUnique({ where: { id: merged.id } });
  if (!row) {
    throw new Error("分镜不存在或不属于该项目");
  }
  return row;
}

// 事务客户端没有 $transaction。已经在事务里就接着用，否则自己开一个。
function isPrismaClient(db: Db): db is PrismaClient {
  return "$transaction" in db;
}

function chapterPanels(db: Db, projectId: string) {
  if (isPrismaClient(db)) return panels(projectId, { db });
  return panels(projectId, { tx: db });
}

function mergeThroughPanels(
  db: Db,
  projectId: string,
  panelIds: string[],
  fields: Partial<NewPanelInput>,
) {
  if (isPrismaClient(db)) {
    return db.$transaction((tx) => panels(projectId, { tx }).merge(panelIds, fields));
  }
  return panels(projectId, { tx: db }).merge(panelIds, fields);
}

async function chapterForSegments(
  db: Db,
  chapterId: string,
  timelineChapterId: string | null | undefined
): Promise<{ chapterId: string | null; timelineChapterId: string | null }> {
  if (!timelineChapterId) {
    return { chapterId, timelineChapterId: null };
  }

  const timeline = await db.timelineChapter.findUnique({
    where: { id: timelineChapterId },
    select: { project_chapter_id: true },
  });
  if (!timeline) {
    throw new Error("时间线章节不存在");
  }

  return {
    chapterId: timeline.project_chapter_id,
    timelineChapterId,
  };
}
