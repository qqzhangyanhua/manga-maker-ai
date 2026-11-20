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
