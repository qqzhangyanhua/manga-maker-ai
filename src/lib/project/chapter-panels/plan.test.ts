import { describe, expect, it } from "vitest";

import { plan } from "./plan";
import type { ChapterDraft } from "./plan";

const draft: ChapterDraft = {
  chapterId: "chapter-1",
  panels: [
    { id: "a", order: 1 },
    { id: "b", order: 2 },
    { id: "c", order: 3 },
  ],
};

describe("plan 插入分镜", () => {
  it("插到章节头部时，新分镜是 1，原有分镜依次后移", () => {
    expect(plan(draft, { op: "add", keys: ["x"], at: { index: 0 } })).toEqual({
      chapterId: "chapter-1",
      inserts: [{ key: "x", order: 1 }],
      orders: [
        { id: "a", order: 2 },
        { id: "b", order: 3 },
        { id: "c", order: 4 },
      ],
      cast: null,
    });
  });

  it("插到章节中间时，只有插入点之后的分镜后移", () => {
    expect(plan(draft, { op: "add", keys: ["x"], at: { index: 1 } })).toEqual({
      chapterId: "chapter-1",
      inserts: [{ key: "x", order: 2 }],
      orders: [
        { id: "b", order: 3 },
        { id: "c", order: 4 },
      ],
      cast: null,
    });
  });

  it("插到章节尾部时，原有编号不变，新分镜接在最后", () => {
    expect(plan(draft, { op: "add", keys: ["x"], at: { index: 3 } })).toEqual({
      chapterId: "chapter-1",
      inserts: [{ key: "x", order: 4 }],
      orders: [],
      cast: null,
    });
  });

  it("一次插入多格时，按输入顺序占住连续编号", () => {
    expect(plan(draft, { op: "add", keys: ["x", "y"], at: { index: 1 } })).toEqual({
      chapterId: "chapter-1",
      inserts: [
        { key: "x", order: 2 },
        { key: "y", order: 3 },
      ],
      orders: [
        { id: "b", order: 4 },
        { id: "c", order: 5 },
      ],
      cast: null,
    });
  });

  it("某格之前、某格之后，和按下标插入是同一次编号", () => {
    const before = plan(draft, { op: "add", keys: ["x"], at: { before: "b" } });
    const after = plan(draft, { op: "add", keys: ["x"], at: { after: "a" } });
    const middle = plan(draft, { op: "add", keys: ["x"], at: { index: 1 } });

    expect(before).toEqual(middle);
    expect(after).toEqual(middle);
  });

  it("尾部插入把空号收成从 1 开始的连续编号", () => {
    const gapped: ChapterDraft = {
      chapterId: "chapter-1",
      panels: [
        { id: "a", order: 1 },
        { id: "b", order: 5 },
      ],
    };

    expect(plan(gapped, { op: "add", keys: ["x"], at: { index: 2 } })).toEqual({
      chapterId: "chapter-1",
      inserts: [{ key: "x", order: 3 }],
      orders: [{ id: "b", order: 2 }],
      cast: null,
    });
  });
});

describe("plan 删除、移动、拆分、合并、整章替换", () => {
  it("删掉中间一格后，后面的分镜连号，前面的不动", () => {
    expect(plan(draft, { op: "remove", ids: ["b"] })).toEqual({
      chapterId: "chapter-1",
      inserts: [],
      orders: [{ id: "c", order: 2 }],
      cast: null,
      removed: ["b"],
    });
  });

  it("有空号的章节删掉一格后收成从 1 开始的连号", () => {
    const gapped: ChapterDraft = {
      chapterId: "chapter-1",
      panels: [
        { id: "a", order: 1 },
        { id: "b", order: 5 },
      ],
    };

    expect(plan(gapped, { op: "remove", ids: ["a"] })).toEqual({
      chapterId: "chapter-1",
      inserts: [],
      orders: [{ id: "b", order: 1 }],
      cast: null,
      removed: ["a"],
    });
  });

  it("同一章里把多格按给定顺序放到某一格之前", () => {
    expect(plan(draft, { op: "place", ids: ["c", "b"], at: { before: "a" } })).toEqual({
      chapterId: "chapter-1",
      inserts: [],
      orders: [
        { id: "c", order: 1 },
        { id: "a", order: 3 },
      ],
      cast: null,
    });
  });

  it("从别的章节移进来的分镜记成到达，本章原有分镜后移", () => {
    expect(plan(draft, { op: "place", ids: ["x", "y"], at: { index: 1 } })).toEqual({
      chapterId: "chapter-1",
      inserts: [],
      orders: [
        { id: "b", order: 4 },
        { id: "c", order: 5 },
      ],
      cast: null,
      arrivals: [
        { id: "x", order: 2 },
        { id: "y", order: 3 },
      ],
    });
  });

  it("不能把分镜放到自己前面", () => {
    expect(() => plan(draft, { op: "place", ids: ["b"], at: { before: "b" } })).toThrowError(
      expect.objectContaining({ statusCode: 400, code: "ANCHOR_IN_SELECTION" }),
    );
  });

  it("拆分用新格占住原位置，后面的分镜顺延", () => {
    expect(plan(draft, { op: "split", id: "b", keys: ["x", "y"] })).toEqual({
      chapterId: "chapter-1",
      inserts: [
        { key: "x", order: 2 },
        { key: "y", order: 3 },
      ],
      orders: [{ id: "c", order: 4 }],
      cast: null,
      removed: ["b"],
    });
  });

  it("合并放在阅读顺序里最先那一格的位置，后面的分镜前移", () => {
    expect(plan(draft, { op: "merge", ids: ["c", "a"], key: "m" })).toEqual({
      chapterId: "chapter-1",
      inserts: [{ key: "m", order: 1 }],
      orders: [],
      cast: null,
      removed: ["a", "c"],
    });
    expect(plan(draft, { op: "merge", ids: ["a", "b"], key: "m" }).orders).toEqual([
      { id: "c", order: 2 },
    ]);
  });

  it("只能合并两格以上，而且都得在这一章", () => {
    expect(() => plan(draft, { op: "merge", ids: ["a"], key: "m" })).toThrowError(
      expect.objectContaining({ statusCode: 400, code: "BAD_REQUEST" }),
    );
    expect(() => plan(draft, { op: "merge", ids: ["a", "missing"], key: "m" })).toThrowError(
      expect.objectContaining({ statusCode: 404, code: "NOT_FOUND" }),
    );
  });

  it("整章替换丢掉旧分镜，新分镜从 1 连号", () => {
    expect(plan(draft, { op: "replace", keys: ["x", "y"] })).toEqual({
      chapterId: "chapter-1",
      inserts: [
        { key: "x", order: 1 },
        { key: "y", order: 2 },
      ],
      orders: [],
      cast: null,
      removed: ["a", "b", "c"],
    });
  });
});
