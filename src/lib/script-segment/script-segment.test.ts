import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { panelReadingOrderBy } from "@/lib/project";
import {
  createChapterScriptSegments,
  mergePanelsKeepingSegment,
  writeStoryboardOnChapter,
} from "./script-segment";

const CHAPTER = "22222222-2222-4222-8222-222222222222";
const OTHER_CHAPTER = "22222222-2222-4222-8222-222222222299";
const ANCHOR = "22222222-2222-4222-8222-222222222223";
const TIMELINE = "11111111-1111-4111-8111-111111111111";
const PROJECT = "33333333-3333-4333-8333-333333333333";
const SEGMENT_ROW = "44444444-4444-4444-8444-444444444444";
const SEGMENT_ROW_2 = "44444444-4444-4444-8444-444444444445";
const PANEL_NEW = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const KEPT_SEGMENT = "55555555-5555-4555-8555-555555555555";

function createDb() {
  const segmentIds = [SEGMENT_ROW, SEGMENT_ROW_2];
  let segmentCount = 0;
  const db = {
    timelineChapter: { findUnique: vi.fn() },
    scriptSegment: { create: vi.fn() },
    panel: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    $executeRaw: vi.fn(),
  };
  db.scriptSegment.create.mockImplementation(async (args: { data: { chapter_id: string | null; timeline_chapter_id: string | null; content: string; source_text_start: number; source_text_end: number; segment_order: number } }) => {
    const id = segmentIds[segmentCount] ?? `segment-extra-${segmentCount}`;
    segmentCount += 1;
    return {
      id,
      chapter_id: args.data.chapter_id,
      timeline_chapter_id: args.data.timeline_chapter_id,
      content: args.data.content,
      source_text_start: args.data.source_text_start,
      source_text_end: args.data.source_text_end,
      segment_order: args.data.segment_order,
    };
  });
  db.panel.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    id: PANEL_NEW,
    ...args.data,
  }));
  db.panel.deleteMany.mockResolvedValue({ count: 2 });
  db.$executeRaw.mockResolvedValue(0);
  return db;
}

const asClient = (db: ReturnType<typeof createDb>) => db as unknown as PrismaClient;

const chapterDraft = {
  segment_order: 1,
  content: "雨夜里，林晓推开门。",
  scene_description: "旧街雨夜",
  character_actions: "推门",
  dialogue: null,
  estimated_duration: 4,
  emotion_tone: "冷",
  source_text_start: 0,
  source_text_end: 10,
};

describe("剧本片段 module", () => {
  it("按章节创建时，module 自己写下章节 id，没有时间线时这个章节 id 仍在", async () => {
    const db = createDb();

    const written = await createChapterScriptSegments(asClient(db), {
      chapterId: CHAPTER,
      segments: [chapterDraft],
    });

    expect(db.timelineChapter.findUnique).not.toHaveBeenCalled();
    const data = db.scriptSegment.create.mock.calls[0][0].data;
    expect(data.chapter_id).toBe(CHAPTER);
    expect(data.timeline_chapter_id).toBeNull();
    expect(data.content).toBe("雨夜里，林晓推开门。");
    expect(written[0]).toMatchObject({
      id: SEGMENT_ROW,
      chapter_id: CHAPTER,
      timeline_chapter_id: null,
    });
  });

  it("有时间线章节时，写下的章节是该时间线的项目章节锚点", async () => {
    const db = createDb();
    db.timelineChapter.findUnique.mockResolvedValue({ project_chapter_id: ANCHOR });

    const written = await createChapterScriptSegments(asClient(db), {
      chapterId: OTHER_CHAPTER,
      timelineChapterId: TIMELINE,
      segments: [chapterDraft],
    });

    expect(db.timelineChapter.findUnique).toHaveBeenCalledWith({
      where: { id: TIMELINE },
      select: { project_chapter_id: true },
    });
    const data = db.scriptSegment.create.mock.calls[0][0].data;
    expect(data.chapter_id).toBe(ANCHOR);
    expect(data.timeline_chapter_id).toBe(TIMELINE);
    expect(written[0].chapter_id).toBe(ANCHOR);
  });

  it("分镜只留下剧本片段 id", async () => {
    const db = createDb();

    const written = await writeStoryboardOnChapter(asClient(db), {
      projectId: PROJECT,
      chapterId: CHAPTER,
      segments: [{ sourceKey: "seg_1", content: "雨夜", start: 0, end: 2 }],
      panels: [
        {
          sourceKey: "seg_1",
          panel_order: 1,
          panel_type: "wide",
          importance: "high",
          description: "林晓站在雨里",
          dialogue: null,
          character_id: null,
          character_name: null,
          emotion: null,
          prompt_used: "rain street",
          script_start: 0,
          script_end: 2,
          camera_angle: null,
          shot_size: null,
          visual_prompt: "雨夜街道",
        },
      ],
    });

    const segmentData = db.scriptSegment.create.mock.calls[0][0].data;
    expect(segmentData.chapter_id).toBe(CHAPTER);
    expect(segmentData.timeline_chapter_id).toBeNull();
    expect(segmentData.content).toBe("雨夜");

    const panelData = db.panel.create.mock.calls[0][0].data;
    expect(panelData.segment_id).toBe(SEGMENT_ROW);
    expect(panelData.chapter_id).toBe(CHAPTER);
    expect(panelData.project_id).toBe(PROJECT);
    expect(panelData).not.toHaveProperty("script_segment_id");
    expect(written.panels[0].segment_id).toBe(SEGMENT_ROW);
    expect(written.segments[0].id).toBe(SEGMENT_ROW);
  });

  it("合并保留第一个分镜的剧本片段 id，不写字符串片段 id", async () => {
    const db = createDb();
    db.panel.findMany.mockResolvedValue([
      {
        id: "panel-early",
        panel_order: 2,
        chapter_id: CHAPTER,
        segment_id: KEPT_SEGMENT,
        script_segment_id: "seg_1",
        script_start: 0,
        script_end: 8,
      },
      {
        id: "panel-late",
        panel_order: 5,
        chapter_id: CHAPTER,
        segment_id: SEGMENT_ROW_2,
        script_segment_id: "seg_2",
        script_start: 8,
        script_end: 20,
      },
    ]);

    const merged = await mergePanelsKeepingSegment(asClient(db), {
      projectId: PROJECT,
      panelIds: ["panel-late", "panel-early"],
      panel: {
        panel_type: "medium",
        importance: "high",
        description: "两格合成的雨夜",
        visual_prompt: "雨夜",
        prompt_used: "merged rain",
        dialogue: null,
        character_id: null,
        emotion: null,
        camera_angle: "平视",
        shot_size: "中景",
      },
    });

    expect(db.panel.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["panel-late", "panel-early"] }, project_id: PROJECT },
      orderBy: panelReadingOrderBy,
    });
    expect(db.panel.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["panel-late", "panel-early"] } },
    });
    const data = db.panel.create.mock.calls[0][0].data;
    expect(data.segment_id).toBe(KEPT_SEGMENT);
    expect(data.panel_order).toBe(2);
    expect(data.script_start).toBe(0);
    expect(data.script_end).toBe(20);
    expect(data.description).toBe("两格合成的雨夜");
    expect(data).not.toHaveProperty("script_segment_id");
    expect(merged.segment_id).toBe(KEPT_SEGMENT);
  });
});
