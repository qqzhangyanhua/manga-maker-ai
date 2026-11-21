import { describe, expect, it } from "vitest";

import { panels } from "./write";
import { CHAPTER, CHAPTER_B, PROJECT, chapterOrders, createFake, type Fake, type StoredPanel } from "./write-fake";

const writer = (fake: Fake) => panels(PROJECT, { tx: fake.tx });

function extra(id: string, chapterId: string, panelOrder: number): StoredPanel {
  return {
    id,
    project_id: PROJECT,
    chapter_id: chapterId,
    panel_order: panelOrder,
    description: id,
    panel_type: "wide",
    importance: "medium",
    pipeline: true,
    created_at: "2026-03-01T00:00:00.000Z",
    segment_id: null,
  };
}

describe("章节分镜移动", () => {
  it("同一章里按给定顺序放到某一格之前", async () => {
    const fake = createFake();

    const placed = await writer(fake).place(["c", "b"], { before: "a" });

    expect(placed).toEqual([
      { id: "c", chapterId: CHAPTER, panelOrder: 1 },
      { id: "b", chapterId: CHAPTER, panelOrder: 2 },
    ]);
    expect(chapterOrders(fake, CHAPTER)).toEqual([["c", 1], ["b", 2], ["a", 3]]);
  });

  it("放到某一格之后时，原来的位置让出来", async () => {
    const fake = createFake();

    await writer(fake).place(["a"], { after: "c" });

    expect(chapterOrders(fake, CHAPTER)).toEqual([["b", 1], ["c", 2], ["a", 3]]);
  });

  it("移到另一章末尾，两章都重新连成 1..N", async () => {
    const fake = createFake();
    fake.panels.push(extra("x", CHAPTER_B, 1));

    const placed = await writer(fake).place(["a"], { chapter: CHAPTER_B });

    expect(placed).toEqual([{ id: "a", chapterId: CHAPTER_B, panelOrder: 2 }]);
    expect(chapterOrders(fake, CHAPTER)).toEqual([["b", 1], ["c", 2]]);
    expect(chapterOrders(fake, CHAPTER_B)).toEqual([["x", 1], ["a", 2]]);
  });

  it("多格移到另一章中间时保持传入的顺序", async () => {
    const fake = createFake();
    fake.panels.push(extra("x", CHAPTER_B, 1));

    await writer(fake).place(["c", "a"], { before: "x" });

    expect(chapterOrders(fake, CHAPTER)).toEqual([["b", 1]]);
    expect(chapterOrders(fake, CHAPTER_B)).toEqual([["c", 1], ["a", 2], ["x", 3]]);
  });

  it("无论从哪一章移向哪一章，都按章节 id 顺序加锁", async () => {
    const fake = createFake();
    fake.panels.push(extra("x", CHAPTER_B, 1));

    await writer(fake).place(["a"], { chapter: CHAPTER_B });
    const forward = [...fake.locks];
    fake.locks.length = 0;
    await writer(fake).place(["x"], { before: "b" });

    expect(forward).toEqual([CHAPTER, CHAPTER_B]);
    expect(fake.locks).toEqual([CHAPTER, CHAPTER_B]);
  });

  it("不能把分镜放到自己前面或后面", async () => {
    const fake = createFake();

    await expect(writer(fake).place(["b"], { after: "b" })).rejects.toMatchObject({
      statusCode: 400,
      code: "ANCHOR_IN_SELECTION",
    });

    expect(chapterOrders(fake, CHAPTER)).toEqual([["a", 1], ["b", 2], ["c", 3]]);
    expect(fake.locks).toEqual([]);
  });

  it("分镜不存在或位置超出范围时不改编号", async () => {
    const fake = createFake();

    await expect(writer(fake).place(["missing"], { chapter: CHAPTER })).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
    await expect(writer(fake).place(["a"], { chapter: CHAPTER, index: 9 })).rejects.toMatchObject({
      statusCode: 400,
      code: "INDEX_OUT_OF_RANGE",
    });

    expect(chapterOrders(fake, CHAPTER)).toEqual([["a", 1], ["b", 2], ["c", 3]]);
  });
});
