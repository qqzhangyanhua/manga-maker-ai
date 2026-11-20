import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { ensureDefaultChapter, resolvePanelChapter } from "./chapter";

function createDb() {
  const db = {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    project: { findUnique: vi.fn() },
    chapter: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  };
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  return db;
}
const asClient = (db: ReturnType<typeof createDb>) => db as unknown as PrismaClient;

describe("项目默认章节", () => {
  it("已有章节时返回顺序最前的章节，不新建", async () => {
    const db = createDb();
    db.chapter.findFirst.mockResolvedValue({ id: "c1" });

    await expect(ensureDefaultChapter(asClient(db), "p1")).resolves.toBe("c1");
    expect(db.$executeRaw).toHaveBeenCalled();
    expect(db.chapter.findFirst).toHaveBeenCalledWith({
      where: { project_id: "p1" },
      orderBy: [{ chapter_order: "asc" }, { created_at: "asc" }],
      select: { id: true },
    });
    expect(db.chapter.create).not.toHaveBeenCalled();
  });

  it("没有章节时建\"第一章\"，故事主项目同时写 story_id", async () => {
    const db = createDb();
    db.chapter.findFirst.mockResolvedValue(null);
    db.project.findUnique.mockResolvedValue({ story_id: "s1" });
    db.chapter.create.mockResolvedValue({ id: "new" });

    await expect(ensureDefaultChapter(asClient(db), "p1")).resolves.toBe("new");
    expect(db.chapter.create).toHaveBeenCalledWith({
      data: { project_id: "p1", story_id: "s1", title: "第一章", chapter_order: 1 },
      select: { id: true },
    });
  });

  it("项目不存在时返回 404", async () => {
    const db = createDb();
    db.chapter.findFirst.mockResolvedValue(null);
    db.project.findUnique.mockResolvedValue(null);

    await expect(ensureDefaultChapter(asClient(db), "p1")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("resolvePanelChapter：指定的章节必须属于该项目", async () => {
    const db = createDb();
    db.chapter.findUnique.mockResolvedValueOnce({ id: "c2", project_id: "other", story_id: null });
    await expect(resolvePanelChapter(asClient(db), "p1", "c2")).rejects.toMatchObject({ statusCode: 400 });

    db.chapter.findUnique.mockResolvedValueOnce({ id: "c2", project_id: "p1", story_id: null });
    await expect(resolvePanelChapter(asClient(db), "p1", "c2")).resolves.toBe("c2");

    db.chapter.findFirst.mockResolvedValue({ id: "c1" });
    await expect(resolvePanelChapter(asClient(db), "p1", undefined)).resolves.toBe("c1");
  });
});
