import type { Prisma, PrismaClient, ScriptSegment } from "@prisma/client";
import { panelReadingOrderBy } from "@/lib/project";

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
  character_id: string | null;
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
  const created = await createChapterScriptSegments(db, {
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
    const row = created[index];
    if (row && !segmentIdByKey.has(segment.sourceKey)) {
      segmentIdByKey.set(segment.sourceKey, row.id);
    }
  });

  const panels: Array<{ id: string; segment_id: string | null }> = [];
  for (const panel of input.panels) {
    const segmentId = panel.sourceKey ? segmentIdByKey.get(panel.sourceKey) ?? null : null;
    const createdPanel = await db.panel.create({
      data: {
        project_id: input.projectId,
        chapter_id: input.chapterId,
        segment_id: segmentId,
        panel_order: panel.panel_order,
        panel_type: panel.panel_type,
        importance: panel.importance,
        description: panel.description,
        dialogue: panel.dialogue,
        character_id: panel.character_id,
        character_name: panel.character_name,
        emotion: panel.emotion,
        prompt_used: panel.prompt_used,
        generated_image: null,
        script_start: panel.script_start,
        script_end: panel.script_end,
        camera_angle: panel.camera_angle,
        shot_size: panel.shot_size,
        visual_prompt: panel.visual_prompt,
      },
    });
    panels.push({ id: createdPanel.id, segment_id: segmentId });
  }

  return {
    segments: created.map((row, index) => ({
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

/** 合并后的分镜留下顺序靠前那一格的剧本片段，不复制字符串片段 id。 */
export async function mergePanelsKeepingSegment(db: Db, input: MergePanelsInput) {
  const panels = await db.panel.findMany({
    where: { id: { in: input.panelIds }, project_id: input.projectId },
    orderBy: panelReadingOrderBy,
  });
  if (panels.length !== 2) {
    throw new Error("分镜不存在或不属于该项目");
  }

  const [earlier, later] = panels;
  await db.panel.deleteMany({ where: { id: { in: input.panelIds } } });
  const created = await db.panel.create({
    data: {
      project_id: input.projectId,
      chapter_id: earlier.chapter_id,
      panel_order: Math.min(earlier.panel_order, later.panel_order),
      panel_type: input.panel.panel_type,
      importance: input.panel.importance,
      description: input.panel.description,
      visual_prompt: input.panel.visual_prompt,
      prompt_used: input.panel.prompt_used,
      dialogue: input.panel.dialogue,
      character_id: input.panel.character_id,
      emotion: input.panel.emotion,
      camera_angle: input.panel.camera_angle,
      shot_size: input.panel.shot_size,
      segment_id: earlier.segment_id,
      script_start: earlier.script_start,
      script_end: later.script_end,
    },
  });

  const laterOrder = Math.max(earlier.panel_order, later.panel_order);
  await db.$executeRaw`
    UPDATE panels
    SET panel_order = panel_order - 1
    WHERE project_id = ${input.projectId}::uuid
      AND panel_order > ${laterOrder}
  `;

  return created;
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
