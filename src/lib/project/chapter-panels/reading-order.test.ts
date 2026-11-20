import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { panelReadingOrderBy, readingOrder } from "./reading-order";

type StoredPanel = {
  id: string;
  project_id: string;
  panel_order: number;
  chapter_id: string;
  chapter_order: number;
  description: string;
};

type OrderKey = Record<string, unknown>;

function createDb(rows: StoredPanel[]) {
  const db = {
    panel: {
      findMany: async (args: {
        where?: { project_id?: string };
        orderBy?: OrderKey | OrderKey[];
        select?: Record<string, boolean>;
        include?: { chapter?: { select?: Record<string, boolean> } };
      }) => {
        const projectId = args.where?.project_id;
        const matched = rows.filter((row) => row.project_id === projectId);
        const ordered = sortByPrismaOrder(matched, args.orderBy);
        return ordered.map((row) => shape(row, args));
      },
    },
  };
  return db;
}

function sortByPrismaOrder(rows: StoredPanel[], orderBy: OrderKey | OrderKey[] | undefined): StoredPanel[] {
  const keys = orderBy === undefined ? [] : Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((left, right) => {
    for (const key of keys) {
      const diff = compareOrderKey(left, right, key);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

function compareOrderKey(left: StoredPanel, right: StoredPanel, key: OrderKey): number {
  const chapter = key.chapter;
  if (chapter && typeof chapter === "object" && "chapter_order" in chapter) {
    const direction = (chapter as { chapter_order?: string }).chapter_order;
    const diff = left.chapter_order - right.chapter_order;
    return direction === "desc" ? -diff : diff;
  }
  if (typeof key.panel_order === "string") {
    const diff = left.panel_order - right.panel_order;
    return key.panel_order === "desc" ? -diff : diff;
  }
  if (typeof key.id === "string") {
    const diff = left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    return key.id === "desc" ? -diff : diff;
  }
  return 0;
}

function shape(
  row: StoredPanel,
  args: {
    select?: Record<string, boolean>;
    include?: { chapter?: { select?: Record<string, boolean> } };
  },
) {
  if (args.select) {
    const selected: Record<string, string | number> = {};
    for (const field of Object.keys(args.select)) {
      if (!args.select[field]) continue;
      if (field === "id" || field === "project_id" || field === "chapter_id" || field === "description") {
        selected[field] = row[field];
      } else if (field === "panel_order") {
        selected[field] = row.panel_order;
      }
    }
    return selected;
  }

  const panel = {
    id: row.id,
    project_id: row.project_id,
    panel_order: row.panel_order,
    chapter_id: row.chapter_id,
    description: row.description,
  };
  if (!args.include?.chapter) return panel;

  const chapterSelect = args.include.chapter.select;
  const chapter = {
    id: row.chapter_id,
    chapter_order: row.chapter_order,
    title: `第${row.chapter_order}章`,
  };
  if (!chapterSelect) return { ...panel, chapter };
  const selectedChapter: Record<string, string | number> = {};
  for (const field of Object.keys(chapterSelect)) {
    if (!chapterSelect[field]) continue;
    if (field === "id" || field === "title") selectedChapter[field] = chapter[field];
    if (field === "chapter_order") selectedChapter[field] = chapter.chapter_order;
  }
  return { ...panel, chapter: selectedChapter };
}

const asClient = (db: ReturnType<typeof createDb>) => db as unknown as PrismaClient;

describe("阅读顺序", () => {
  it("共享排序条件是章节顺序、章节内顺序、id", () => {
    expect(panelReadingOrderBy).toEqual([
      { chapter: { chapter_order: "asc" } },
      { panel_order: "asc" },
      { id: "asc" },
    ]);
  });

  it("两个章节各自从 1 编号时，先返回第一章再返回第二章", async () => {
    const db = createDb([
      { id: "ch2-2", project_id: "p1", panel_order: 2, chapter_id: "c2", chapter_order: 2, description: "第二章第二格" },
      { id: "ch1-2", project_id: "p1", panel_order: 2, chapter_id: "c1", chapter_order: 1, description: "第一章第二格" },
      { id: "other", project_id: "p2", panel_order: 1, chapter_id: "c9", chapter_order: 1, description: "别的项目" },
      { id: "ch2-1", project_id: "p1", panel_order: 1, chapter_id: "c2", chapter_order: 2, description: "第二章第一格" },
      { id: "ch1-1", project_id: "p1", panel_order: 1, chapter_id: "c1", chapter_order: 1, description: "第一章第一格" },
    ]);

    const panels = await readingOrder(asClient(db), "p1", { select: { id: true } });

    expect(panels).toEqual([{ id: "ch1-1" }, { id: "ch1-2" }, { id: "ch2-1" }, { id: "ch2-2" }]);
  });

  it("章节和章节内顺序都相同的分镜按 id 排", async () => {
    const db = createDb([
      { id: "b", project_id: "p1", panel_order: 1, chapter_id: "c1", chapter_order: 1, description: "后" },
      { id: "a", project_id: "p1", panel_order: 1, chapter_id: "c1", chapter_order: 1, description: "先" },
    ]);

    const panels = await readingOrder(asClient(db), "p1", { select: { id: true } });

    expect(panels).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("按项目连续编号时，顺序与只按 panel_order 相同", async () => {
    const rows: StoredPanel[] = [
      { id: "p3", project_id: "p1", panel_order: 3, chapter_id: "c2", chapter_order: 2, description: "三" },
      { id: "p1", project_id: "p1", panel_order: 1, chapter_id: "c1", chapter_order: 1, description: "一" },
      { id: "p4", project_id: "p1", panel_order: 4, chapter_id: "c2", chapter_order: 2, description: "四" },
      { id: "p2", project_id: "p1", panel_order: 2, chapter_id: "c1", chapter_order: 1, description: "二" },
    ];
    const legacyOrder = [...rows]
      .sort((left, right) => left.panel_order - right.panel_order)
      .map((row) => row.id);
    expect(legacyOrder).toEqual(["p1", "p2", "p3", "p4"]);

    const panels = await readingOrder(asClient(createDb(rows)), "p1", { select: { id: true } });

    expect(panels.map((panel) => panel.id)).toEqual(legacyOrder);
  });

  it("include 会带上章节", async () => {
    const db = createDb([
      { id: "ch1-1", project_id: "p1", panel_order: 1, chapter_id: "c1", chapter_order: 1, description: "开场" },
    ]);

    const panels = await readingOrder(asClient(db), "p1", {
      include: { chapter: { select: { id: true, chapter_order: true } } },
    });

    expect(panels).toEqual([
      {
        id: "ch1-1",
        project_id: "p1",
        panel_order: 1,
        chapter_id: "c1",
        description: "开场",
        chapter: { id: "c1", chapter_order: 1 },
      },
    ]);
  });
});
