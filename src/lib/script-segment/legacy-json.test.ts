import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";

import {
  migrateLegacyJsonSegments,
  readMigratedPanelSegmentIds,
  readProjectChapterSegments,
  readSnapshotSegments,
  restoreProjectChapterSegments,
  toStoryboardPanelSegments,
  withMigratedSegmentIds,
} from "./legacy-json";
import type { ChapterSegmentRecord } from "./legacy-json";
import { DEFAULT_CHAPTER_TITLE } from "@/lib/project";

const PROJECT = "33333333-3333-4333-8333-333333333333";
const CHAPTER = "22222222-2222-4222-8222-222222222221";
const LATER_CHAPTER = "22222222-2222-4222-8222-222222222222";
const PANEL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const PANEL_LATER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const CANVAS_ROW = "44444444-4444-4444-8444-444444444444";
const RESTORED_ROW = "44444444-4444-4444-8444-444444444445";

describe("剧本片段 module", () => {
  it("被分镜指到的 JSON 片段迁到那些分镜所在的章节，分镜改为指向新的剧本片段", async () => {
    const { db, state } = createMemoryDb({
      chapters: [chapter(CHAPTER, 1)],
      panels: [panel(PANEL, CHAPTER, "seg_1")],
      jsonSegments: [{ id: "seg_1", text: "雨夜里，林晓推开门。", start: 0, end: 12 }],
    });

    await migrateLegacyJsonSegments(asClient(db), PROJECT);

    expect(state.segments).toHaveLength(1);
    expect(state.segments[0]).toMatchObject({
      chapter_id: CHAPTER,
      content: "雨夜里，林晓推开门。",
      source_text_start: 0,
      source_text_end: 12,
    });
    expect(state.panels[0].segment_id).toBe(state.segments[0].id);
    const stale = panel(PANEL, CHAPTER, "seg_1");
    const linked = withMigratedSegmentIds(
      [stale],
      await readMigratedPanelSegmentIds(asClient(db), PROJECT),
    );
    expect(stale.segment_id).toBeNull();
    expect(linked[0].segment_id).toBe(state.segments[0].id);
    expect(state.panelUpdates[0].data).toEqual({ segment_id: state.segments[0].id });
    expect(state.panelUpdates[0].data).not.toHaveProperty("script_segment_id");
    expect(state.script?.segments).toEqual([]);
  });

  it("同一段 JSON 被不同章节的分镜指到时，各章都有一行，分镜指向自己那一章", async () => {
    const { db, state } = createMemoryDb({
      chapters: [chapter(CHAPTER, 1), chapter(LATER_CHAPTER, 2)],
      panels: [panel(PANEL, CHAPTER, "seg_1"), panel(PANEL_LATER, LATER_CHAPTER, "seg_1")],
      jsonSegments: [{ id: "seg_1", text: "两章都用到的雨夜", start: 0, end: 8 }],
    });

    await migrateLegacyJsonSegments(asClient(db), PROJECT);

    const early = state.segments.find((item) => item.chapter_id === CHAPTER);
    const later = state.segments.find((item) => item.chapter_id === LATER_CHAPTER);
    expect(early?.content).toBe("两章都用到的雨夜");
    expect(later?.content).toBe("两章都用到的雨夜");
    expect(early?.id).not.toBe(later?.id);
    expect(state.panels.find((item) => item.id === PANEL)?.segment_id).toBe(early?.id);
    expect(state.panels.find((item) => item.id === PANEL_LATER)?.segment_id).toBe(later?.id);
  });

  it("没有任何分镜指向的 JSON 片段，迁到顺序最前的章节", async () => {
    const { db, state } = createMemoryDb({
      chapters: [chapter(LATER_CHAPTER, 2), chapter(CHAPTER, 1)],
      panels: [],
      jsonSegments: [{ id: "seg_orphan", text: "没有格子指着这段。", start: 3, end: 8 }],
    });

    await migrateLegacyJsonSegments(asClient(db), PROJECT);

    expect(state.segments).toHaveLength(1);
    expect(state.segments[0]).toMatchObject({
      chapter_id: CHAPTER,
      content: "没有格子指着这段。",
      source_text_start: 3,
      source_text_end: 8,
    });
    expect(state.panelUpdates).toHaveLength(0);
  });

  it("项目还没有章节时，没有分镜指向的片段迁到默认章节", async () => {
    const { db, state } = createMemoryDb({
      chapters: [],
      panels: [],
      jsonSegments: [{ id: "seg_orphan", text: "先放到默认章节。", start: 0, end: 4 }],
      storyId: "66666666-6666-4666-8666-666666666666",
    });

    await migrateLegacyJsonSegments(asClient(db), PROJECT);

    expect(state.chapters).toHaveLength(1);
    expect(state.chapters[0]).toMatchObject({
      project_id: PROJECT,
      title: DEFAULT_CHAPTER_TITLE,
      chapter_order: 1,
      story_id: "66666666-6666-4666-8666-666666666666",
    });
    expect(state.segments).toHaveLength(1);
    expect(state.segments[0].chapter_id).toBe(state.chapters[0].id);
    expect(state.segments[0].content).toBe("先放到默认章节。");
  });

  it("画布已经按章节写好的剧本片段不被复制", async () => {
    const canvasRow: MemorySegment = {
      id: CANVAS_ROW,
      chapter_id: CHAPTER,
      timeline_chapter_id: "11111111-1111-4111-8111-111111111111",
      segment_order: 1,
      content: "画布上已经有的雨夜",
      scene_description: "画布上已经有的雨夜",
      character_actions: "",
      dialogue: null,
      estimated_duration: 0,
      emotion_tone: "",
      source_text_start: 0,
      source_text_end: 9,
    };
    const { db, state } = createMemoryDb({
      chapters: [chapter(CHAPTER, 1)],
      panels: [panel(PANEL, CHAPTER, CANVAS_ROW)],
      jsonSegments: [
        { id: CANVAS_ROW, text: "画布上已经有的雨夜", start: 0, end: 9 },
        { id: "seg_1", text: "还在 JSON 里的旧片段", start: 10, end: 16 },
      ],
      segments: [canvasRow],
    });

    await migrateLegacyJsonSegments(asClient(db), PROJECT);

    const created = state.segments.filter((item) => item.id !== CANVAS_ROW);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      chapter_id: CHAPTER,
      content: "还在 JSON 里的旧片段",
    });
    expect(state.segments.find((item) => item.id === CANVAS_ROW)).toMatchObject({
      chapter_id: CHAPTER,
      content: "画布上已经有的雨夜",
      timeline_chapter_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(state.panels[0].segment_id).toBe(CANVAS_ROW);
  });

  it("画布行已经在别的章节上时，不复制到分镜所在的章节", async () => {
    const canvasRow: MemorySegment = {
      id: CANVAS_ROW,
      chapter_id: CHAPTER,
      timeline_chapter_id: "11111111-1111-4111-8111-111111111111",
      segment_order: 1,
      content: "画布上已经有的雨夜",
      scene_description: "画布上已经有的雨夜",
      character_actions: "",
      dialogue: null,
      estimated_duration: 0,
      emotion_tone: "",
      source_text_start: 0,
      source_text_end: 9,
    };
    const { db, state } = createMemoryDb({
      chapters: [chapter(CHAPTER, 1), chapter(LATER_CHAPTER, 2)],
      panels: [panel(PANEL_LATER, LATER_CHAPTER, CANVAS_ROW)],
      jsonSegments: [{ id: CANVAS_ROW, text: "画布上已经有的雨夜", start: 0, end: 9 }],
      segments: [canvasRow],
    });

    await migrateLegacyJsonSegments(asClient(db), PROJECT);

    expect(state.segments).toHaveLength(1);
    expect(state.segments[0]).toMatchObject({
      id: CANVAS_ROW,
      chapter_id: CHAPTER,
      timeline_chapter_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(state.panels[0].segment_id).toBe(CANVAS_ROW);
  });

  it("快照和导出读到的是章节上的行，不读项目级 JSON", async () => {
    const canvasRow: MemorySegment = {
      id: CANVAS_ROW,
      chapter_id: CHAPTER,
      timeline_chapter_id: null,
      segment_order: 1,
      content: "章节上的雨夜",
      scene_description: "章节上的雨夜",
      character_actions: "",
      dialogue: null,
      estimated_duration: 0,
      emotion_tone: "",
      source_text_start: 0,
      source_text_end: 6,
    };
    const { db, state } = createMemoryDb({
      chapters: [chapter(LATER_CHAPTER, 2), chapter(CHAPTER, 1)],
      panels: [],
      jsonSegments: [{ id: "seg_json", text: "JSON里的名单", start: 1, end: 4 }],
      segments: [canvasRow],
    });

    const read = await readProjectChapterSegments(asClient(db), PROJECT);

    expect(read.map((item) => item.content)).toEqual(["章节上的雨夜", "JSON里的名单"]);
    expect(read.every((item) => item.chapter_id === CHAPTER)).toBe(true);
    expect(read[0]).toMatchObject({
      id: CANVAS_ROW,
      segment_order: 1,
      source_text_start: 0,
      source_text_end: 6,
    });
    expect(toStoryboardPanelSegments(read)[0]).toEqual({
      id: CANVAS_ROW,
      text: "章节上的雨夜",
      start: 0,
      end: 6,
    });
    expect(state.script?.segments).toEqual([]);
  });

  it("恢复写下章节上的行，不把片段名单写回项目级 JSON", async () => {
    const oldRow: MemorySegment = {
      id: CANVAS_ROW,
      chapter_id: CHAPTER,
      timeline_chapter_id: null,
      segment_order: 1,
      content: "恢复前的旧行",
      scene_description: "恢复前的旧行",
      character_actions: "",
      dialogue: null,
      estimated_duration: 0,
      emotion_tone: "",
      source_text_start: 0,
      source_text_end: 4,
    };
    const snapshot: ChapterSegmentRecord = {
      id: RESTORED_ROW,
      chapter_id: CHAPTER,
      segment_order: 2,
      content: "恢复回来的雨夜",
      source_text_start: 4,
      source_text_end: 9,
    };
    const { db, state } = createMemoryDb({
      chapters: [chapter(CHAPTER, 1)],
      panels: [],
      jsonSegments: [],
      segments: [oldRow],
    });

    await restoreProjectChapterSegments(asClient(db), PROJECT, [snapshot]);
    const read = await readProjectChapterSegments(asClient(db), PROJECT);

    expect(read).toEqual([snapshot]);
    expect(state.script?.content).toBe("全文");
    expect(state.script?.segments).toEqual([]);
    expect(JSON.stringify(state.storyScriptUpdates)).not.toContain("恢复回来的雨夜");
  });

  it("旧快照里的 JSON 片段恢复到现有章节，不写回项目级 JSON", async () => {
    const { db, state } = createMemoryDb({
      chapters: [chapter(CHAPTER, 1)],
      panels: [],
      jsonSegments: [{ id: "seg_old", text: "不该再被读出来", start: 0, end: 2 }],
    });

    const snapshot = readSnapshotSegments([{ id: "seg_1", text: "旧快照里的雨夜", start: 2, end: 7 }]);
    await restoreProjectChapterSegments(asClient(db), PROJECT, snapshot);
    const read = await readProjectChapterSegments(asClient(db), PROJECT);

    expect(read).toHaveLength(1);
    expect(read[0]).toMatchObject({
      chapter_id: CHAPTER,
      content: "旧快照里的雨夜",
      source_text_start: 2,
      source_text_end: 7,
    });
    expect(read[0].id).not.toBe("seg_1");
    expect(state.script?.segments).toEqual([]);
    expect(JSON.stringify(state.storyScriptUpdates)).not.toContain("旧快照里的雨夜");
  });
});

interface JsonSegment {
  id: string;
  text: string;
  start: number;
  end: number;
}

interface MemoryChapter {
  id: string;
  project_id: string;
  chapter_order: number;
  created_at: Date;
  title: string;
  story_id: string | null;
}

interface MemorySegment {
  id: string;
  chapter_id: string | null;
  timeline_chapter_id: string | null;
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

interface MemoryPanel {
  id: string;
  project_id: string;
  chapter_id: string;
  script_segment_id: string | null;
  segment_id: string | null;
}

function chapter(id: string, chapterOrder: number): MemoryChapter {
  return {
    id,
    project_id: PROJECT,
    chapter_order: chapterOrder,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    title: `第${chapterOrder}章`,
    story_id: null,
  };
}

function panel(id: string, chapterId: string, scriptSegmentId: string | null, segmentId: string | null = null): MemoryPanel {
  return {
    id,
    project_id: PROJECT,
    chapter_id: chapterId,
    script_segment_id: scriptSegmentId,
    segment_id: segmentId,
  };
}

function createMemoryDb(seed: {
  chapters: MemoryChapter[];
  panels: MemoryPanel[];
  jsonSegments: JsonSegment[];
  segments?: MemorySegment[];
  storyId?: string | null;
}) {
  let segmentCount = 0;
  const state = {
    chapters: seed.chapters.map((item) => ({ ...item })),
    segments: (seed.segments ?? []).map((item) => ({ ...item })),
    panels: seed.panels.map((item) => ({ ...item })),
    script: {
      id: "script-1",
      project_id: PROJECT,
      content: "全文",
      segments: seed.jsonSegments,
    },
    panelUpdates: [] as Array<{ where: { id: string }; data: Record<string, unknown> }>,
    storyScriptUpdates: [] as Array<Record<string, unknown>>,
  };

  const db = {
    storyScript: {
      findUnique: async ({ where }: { where: { project_id: string } }) =>
        state.script.project_id === where.project_id ? state.script : null,
      update: async ({ where, data }: { where: { project_id: string }; data: { segments?: unknown; content?: string } }) => {
        state.storyScriptUpdates.push(data);
        if (state.script.project_id === where.project_id) {
          state.script = { ...state.script, ...data, segments: data.segments ?? state.script.segments };
        }
        return state.script;
      },
    },
    panel: {
      findMany: async ({ where }: { where: { project_id: string } }) =>
        state.panels.filter((item) => item.project_id === where.project_id),
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        state.panelUpdates.push({ where, data });
        const found = state.panels.find((item) => item.id === where.id);
        if (found) Object.assign(found, data);
        return found;
      },
    },
    project: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === PROJECT ? { id: PROJECT, story_id: seed.storyId ?? null } : null,
    },
    $executeRaw: async () => 0,
    chapter: {
      findMany: async ({ where }: { where: { project_id: string } }) =>
        state.chapters.filter((item) => item.project_id === where.project_id),
      findFirst: async ({ where }: { where: { project_id: string } }) =>
        state.chapters.find((item) => item.project_id === where.project_id) ?? null,
      create: async ({ data }: { data: { project_id: string; story_id: string | null; title: string; chapter_order: number } }) => {
        const created: MemoryChapter = {
          id: "22222222-2222-4222-8222-222222222299",
          project_id: data.project_id,
          chapter_order: data.chapter_order,
          created_at: new Date("2026-02-01T00:00:00.000Z"),
          title: data.title,
          story_id: data.story_id,
        };
        state.chapters.push(created);
        return created;
      },
    },
    scriptSegment: {
      findMany: async ({ where }: { where: { chapter_id: { in: string[] } } }) =>
        state.segments.filter((item) => item.chapter_id !== null && where.chapter_id.in.includes(item.chapter_id)),
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        const ids = new Set(where.id.in);
        const before = state.segments.length;
        state.segments = state.segments.filter((item) => !ids.has(item.id));
        return { count: before - state.segments.length };
      },
      create: async ({ data }: { data: Omit<MemorySegment, "id"> & { id?: string } }) => {
        segmentCount += 1;
        const created: MemorySegment = {
          id: data.id ?? `55555555-5555-4555-8555-55555555555${segmentCount}`,
          chapter_id: data.chapter_id,
          timeline_chapter_id: data.timeline_chapter_id,
          segment_order: data.segment_order,
          content: data.content,
          scene_description: data.scene_description,
          character_actions: data.character_actions,
          dialogue: data.dialogue,
          estimated_duration: data.estimated_duration,
          emotion_tone: data.emotion_tone,
          source_text_start: data.source_text_start,
          source_text_end: data.source_text_end,
        };
        state.segments.push(created);
        return created;
      },
    },
  };

  return { db, state };
}

const asClient = (db: ReturnType<typeof createMemoryDb>["db"]) => db as unknown as PrismaClient;
