import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { anchorTimelineChapters } from "./timeline-anchor";

function createDb() {
  const db = {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    canvasTimeline: { findUnique: vi.fn() },
    timelineChapter: { findMany: vi.fn(), update: vi.fn() },
    chapter: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    project: { findUnique: vi.fn() },
    novelChapter: { findMany: vi.fn() },
  };
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  return db;
}
const asClient = (db: ReturnType<typeof createDb>) => db as unknown as PrismaClient;

describe("时间线章节锚定项目章节", () => {
  it("时间线未归属项目时不做任何事", async () => {
    const db = createDb();
    db.canvasTimeline.findUnique.mockResolvedValue({ project_id: null });

    await expect(anchorTimelineChapters(asClient(db), "t1")).resolves.toEqual({ anchored: 0, created: 0, skipped: 0 });
    expect(db.timelineChapter.findMany).not.toHaveBeenCalled();
  });

  it("已锚定到本项目章节的不变动", async () => {
    const db = createDb();
    db.canvasTimeline.findUnique.mockResolvedValue({ project_id: "p1" });
    db.timelineChapter.findMany.mockResolvedValue([
      { id: "tc1", chapter_id: "n1", project_chapter: { project_id: "p1" } },
    ]);

    await expect(anchorTimelineChapters(asClient(db), "t1")).resolves.toEqual({ anchored: 0, created: 0, skipped: 0 });
    expect(db.$executeRaw).not.toHaveBeenCalled();
    expect(db.timelineChapter.update).not.toHaveBeenCalled();
  });

  it("复用来源相同的项目章节，缺的按小说章节顺序新建并接在末尾", async () => {
    const db = createDb();
    db.canvasTimeline.findUnique.mockResolvedValue({ project_id: "p1" });
    db.timelineChapter.findMany.mockResolvedValue([
      { id: "tc1", chapter_id: "n1", project_chapter: null },
      { id: "tc2", chapter_id: "n2", project_chapter: null },
      // 时间线改过归属，旧锚点在别的项目上
      { id: "tc3", chapter_id: "n3", project_chapter: { project_id: "old" } },
    ]);
    db.chapter.findMany.mockResolvedValue([{ id: "c1", source_novel_chapter_id: "n1" }]);
    db.project.findUnique.mockResolvedValue({ story_id: "s1" });
    db.novelChapter.findMany.mockResolvedValue([
      { id: "n2", chapter_number: 2, title: "第二章 夜", outline: "大纲2", content: "正文2", is_key_chapter: true },
      { id: "n3", chapter_number: 3, title: "", outline: null, content: null, is_key_chapter: false },
    ]);
    db.chapter.findFirst.mockResolvedValue({ chapter_order: 4 });
    db.chapter.create.mockResolvedValueOnce({ id: "c2" }).mockResolvedValueOnce({ id: "c3" });

    await expect(anchorTimelineChapters(asClient(db), "t1")).resolves.toEqual({ anchored: 3, created: 2, skipped: 0 });

    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(db.chapter.create).toHaveBeenNthCalledWith(1, {
      data: {
        project_id: "p1",
        story_id: "s1",
        title: "第二章 夜",
        summary: "大纲2",
        content: "正文2",
        is_key_chapter: true,
        source_novel_chapter_id: "n2",
        chapter_order: 5,
      },
      select: { id: true },
    });
    expect(db.chapter.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ title: "第3章", chapter_order: 6, source_novel_chapter_id: "n3" }),
    }));
    expect(db.timelineChapter.update.mock.calls.map((c) => c[0])).toEqual([
      { where: { id: "tc1" }, data: { project_chapter_id: "c1" } },
      { where: { id: "tc2" }, data: { project_chapter_id: "c2" } },
      { where: { id: "tc3" }, data: { project_chapter_id: "c3" } },
    ]);
  });

  it("来源小说章节已删除时跳过，不建空章节", async () => {
    const db = createDb();
    db.canvasTimeline.findUnique.mockResolvedValue({ project_id: "p1" });
    db.timelineChapter.findMany.mockResolvedValue([{ id: "tc1", chapter_id: "gone", project_chapter: null }]);
    db.chapter.findMany.mockResolvedValue([]);
    db.project.findUnique.mockResolvedValue({ story_id: null });
    db.novelChapter.findMany.mockResolvedValue([]);
    db.chapter.findFirst.mockResolvedValue(null);

    await expect(anchorTimelineChapters(asClient(db), "t1")).resolves.toEqual({ anchored: 0, created: 0, skipped: 1 });
    expect(db.chapter.create).not.toHaveBeenCalled();
    expect(db.timelineChapter.update).not.toHaveBeenCalled();
  });
});
