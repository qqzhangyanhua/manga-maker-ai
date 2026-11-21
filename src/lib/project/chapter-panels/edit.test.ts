import { describe, expect, it } from "vitest";

import { panels } from "./write";
import {
  CHAPTER,
  CHAPTER_B,
  OTHER_PC,
  OUTFIT,
  PC1,
  PC2,
  PROJECT,
  chapterOrders,
  createFake,
  type Fake,
  type StoredCast,
  type StoredPanel,
} from "./write-fake";

const SEGMENT = "77777777-7777-4777-8777-777777777777";
const writer = (fake: Fake) => panels(PROJECT, { tx: fake.tx });

function row(
  panelId: string,
  projectCharacterId: string | null,
  sortOrder: number,
  extra: Partial<StoredCast> = {},
): StoredCast {
  return {
    panel_id: panelId,
    project_character_id: projectCharacterId,
    outfit_id: null,
    expression_type: null,
    sort_order: sortOrder,
    pending_character_key: null,
    pending_character_name: null,
    ...extra,
  };
}

function aside(id: string): StoredPanel {
  return {
    id,
    project_id: PROJECT,
    chapter_id: CHAPTER_B,
    panel_order: 1,
    description: id,
    panel_type: "wide",
    importance: "low",
    pipeline: true,
    created_at: "2026-03-01T00:00:00.000Z",
    segment_id: null,
  };
}

describe("拆分、合并、主角色和整章替换", () => {
  it("拆分继承剧本片段和在场角色，后面的分镜后移，别的章节不动", async () => {
    const fake = createFake();
    const source = fake.panels.find((panel) => panel.id === "b");
    if (!source) throw new Error("缺少分镜");
    source.segment_id = SEGMENT;
    fake.cast.push(row("b", PC1, 0, { outfit_id: OUTFIT, expression_type: "happy" }));
    fake.cast.push(row("b", null, 1, { pending_character_key: "ghost", pending_character_name: "鬼" }));
    fake.panels.push(aside("x"));

    const created = await writer(fake).split("b", [
      { description: "左半" },
      { panelType: "closeup", description: "右半" },
    ]);

    expect(created.map((panel) => panel.panelOrder)).toEqual([2, 3]);
    expect(chapterOrders(fake, CHAPTER)).toEqual([["a", 1], ["new-1", 2], ["new-2", 3], ["c", 4]]);
    expect(chapterOrders(fake, CHAPTER_B)).toEqual([["x", 1]]);
    const left = fake.panels.find((panel) => panel.id === "new-1");
    const right = fake.panels.find((panel) => panel.id === "new-2");
    expect(left?.segment_id).toBe(SEGMENT);
    expect(left?.panel_type).toBe("dialogue");
    expect(left?.description).toBe("左半");
    expect(right?.panel_type).toBe("closeup");
    expect(fake.cast.filter((item) => item.panel_id === "new-1").map((item) => [
      item.project_character_id,
      item.outfit_id,
      item.expression_type,
      item.pending_character_key,
    ])).toEqual([
      [PC1, OUTFIT, "happy", null],
      [null, null, null, "ghost"],
    ]);
    expect(fake.panels.some((panel) => panel.id === "b")).toBe(false);
    expect(left).not.toHaveProperty("character_id");
  });

  it("合并保留草稿里最靠前那格的片段，在场角色按它在前去重", async () => {
    const fake = createFake();
    const first = fake.panels.find((panel) => panel.id === "a");
    if (!first) throw new Error("缺少分镜");
    first.segment_id = SEGMENT;
    fake.cast.push(row("a", PC1, 0, { outfit_id: OUTFIT }));
    fake.cast.push(row("a", PC2, 1));
    fake.cast.push(row("b", PC2, 0, { expression_type: "angry" }));
    fake.cast.push(row("b", null, 1, { pending_character_key: "ghost", pending_character_name: "鬼" }));

    const created = await writer(fake).merge(["b", "a"], {
      description: "合并",
      scriptStart: 0,
      scriptEnd: 20,
    });

    expect(created).toEqual({ id: "new-1", panelOrder: 1 });
    expect(chapterOrders(fake, CHAPTER)).toEqual([["new-1", 1], ["c", 2]]);
    const merged = fake.panels.find((panel) => panel.id === "new-1");
    expect(merged?.segment_id).toBe(SEGMENT);
    expect(merged?.description).toBe("合并");
    expect(merged?.script_start).toBe(0);
    expect(merged?.script_end).toBe(20);
    expect(fake.cast.map((item) => [
      item.project_character_id,
      item.outfit_id,
      item.expression_type,
      item.pending_character_key,
      item.sort_order,
    ])).toEqual([
      [PC1, OUTFIT, null, null, 0],
      [PC2, null, null, null, 1],
      [null, null, null, "ghost", 2],
    ]);
  });

  it("不同章节的分镜不能合并", async () => {
    const fake = createFake();
    const other = fake.panels.find((panel) => panel.id === "c");
    if (!other) throw new Error("缺少分镜");
    other.chapter_id = CHAPTER_B;

    await expect(writer(fake).merge(["a", "c"])).rejects.toMatchObject({
      statusCode: 400,
      code: "DIFFERENT_CHAPTERS",
    });

    expect(fake.panels).toHaveLength(3);
    expect(fake.locks).toEqual([]);
  });

  it("已在场的角色换到第一位，未绑定的行还在，不写主角色列", async () => {
    const fake = createFake();
    fake.cast.push(row("a", PC2, 0));
    fake.cast.push(row("a", null, 1, { pending_character_key: "ghost", pending_character_name: "鬼" }));
    fake.cast.push(row("a", PC1, 2, { outfit_id: OUTFIT, expression_type: "happy" }));

    await writer(fake).setLead(["a"], PC1);

    expect(fake.cast.map((item) => [
      item.project_character_id,
      item.outfit_id,
      item.expression_type,
      item.pending_character_key,
      item.sort_order,
    ])).toEqual([
      [PC1, OUTFIT, "happy", null, 0],
      [PC2, null, null, null, 1],
      [null, null, null, "ghost", 2],
    ]);
    expect(fake.panels.find((panel) => panel.id === "a")).not.toHaveProperty("character_id");
  });

  it("不在场时补到第一位；别的项目的角色整次拒绝", async () => {
    const fake = createFake();
    fake.cast.push(row("a", PC2, 0, { expression_type: "angry" }));

    await writer(fake).setLead(["a"], PC1);

    expect(fake.cast.map((item) => [item.project_character_id, item.expression_type, item.sort_order])).toEqual([
      [PC1, null, 0],
      [PC2, "angry", 1],
    ]);

    const before = fake.cast.map((item) => item.project_character_id);
    await expect(writer(fake).setLead(["a"], OTHER_PC)).rejects.toMatchObject({
      statusCode: 400,
      code: "PROJECT_CHARACTER_MISMATCH",
    });
    expect(fake.cast.map((item) => item.project_character_id)).toEqual(before);
  });

  it("多章一起换主角色时按章节 id 顺序加锁", async () => {
    const fake = createFake();
    fake.panels.push(aside("x"));

    await writer(fake).setLead(["x", "a"], PC1);

    expect(fake.locks).toEqual([CHAPTER, CHAPTER_B]);
    expect(fake.cast.map((item) => [item.panel_id, item.project_character_id, item.sort_order])).toEqual([
      ["x", PC1, 0],
      ["a", PC1, 0],
    ]);
  });

  it("整章替换删掉旧分镜并按 1..N 建新的，每格都有流程状态", async () => {
    const fake = createFake();
    fake.cast.push(row("a", PC1, 0));
    fake.variants.push({ id: "v1", panel_id: "b" });
    fake.panels.push(aside("x"));

    const replaced = await writer(fake).replaceChapter(CHAPTER, [
      { panelType: "wide", description: "新甲", dialogue: "你好", cameraMovement: "pan_left" },
      { panelType: "closeup", description: "新乙" },
    ]);

    expect(replaced.panels.map((panel) => panel.panelOrder)).toEqual([1, 2]);
    expect(replaced.discarded).toEqual({ variants: 1, pipelineStates: 3, cast: 1, canvasLinks: 0 });
    expect(chapterOrders(fake, CHAPTER)).toEqual([["new-1", 1], ["new-2", 2]]);
    expect(chapterOrders(fake, CHAPTER_B)).toEqual([["x", 1]]);
    const created = fake.panels.find((panel) => panel.id === "new-1");
    expect(created?.dialogue).toBe("你好");
    expect(created?.camera_movement).toBe("pan_left");
    expect(created?.pipeline).toBe(true);
    expect(created).not.toHaveProperty("character_id");
    expect(fake.cast).toEqual([]);
  });

  it("空的替换会清空这一章", async () => {
    const fake = createFake();

    const replaced = await writer(fake).replaceChapter(CHAPTER, []);

    expect(replaced.panels).toEqual([]);
    expect(replaced.discarded.pipelineStates).toBe(3);
    expect(chapterOrders(fake, CHAPTER)).toEqual([]);
  });
});
