import { describe, expect, it } from "vitest";

import { panels } from "./write";
import {
  CHAPTER,
  CHAPTER_B,
  OTHER,
  PC1,
  PROJECT,
  chapterOrders,
  createFake,
  type Fake,
  type StoredCast,
  type StoredPanel,
} from "./write-fake";

const writer = (fake: Fake) => panels(PROJECT, { tx: fake.tx });

function row(panelId: string, projectCharacterId: string | null, sortOrder: number): StoredCast {
  return {
    panel_id: panelId,
    project_character_id: projectCharacterId,
    outfit_id: null,
    expression_type: null,
    sort_order: sortOrder,
    pending_character_key: null,
    pending_character_name: null,
  };
}

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

describe("章节分镜删除", () => {
  it("删掉第二章中间一格后，这一章重新连成 1..N，另一章不动", async () => {
    const fake = createFake();
    for (const panel of fake.panels) panel.chapter_id = CHAPTER_B;
    fake.panels.push(extra("keep", CHAPTER, 1));

    await writer(fake).remove(["b"]);

    expect(chapterOrders(fake, CHAPTER)).toEqual([["keep", 1]]);
    expect(chapterOrders(fake, CHAPTER_B)).toEqual([["a", 1], ["c", 2]]);
  });

  it("一次删掉多章的分镜时，每一章各自重新编号", async () => {
    const fake = createFake();
    fake.panels.push(extra("y", CHAPTER_B, 1), extra("x", CHAPTER_B, 2));

    await writer(fake).remove(["b", "y"]);

    expect(chapterOrders(fake, CHAPTER)).toEqual([["a", 1], ["c", 2]]);
    expect(chapterOrders(fake, CHAPTER_B)).toEqual([["x", 1]]);
  });

  it("返回被丢掉的候选图、流程状态、在场角色和画布关联", async () => {
    const fake = createFake();
    fake.variants.push({ id: "v1", panel_id: "b" });
    fake.shots.push({ id: "s1", panel_id: "b" });
    fake.cast.push(row("b", PC1, 0));

    const discarded = await writer(fake).remove(["b"]);

    expect(discarded).toEqual({ variants: 1, pipelineStates: 1, cast: 1, canvasLinks: 1 });
    expect(chapterOrders(fake, CHAPTER)).toEqual([["a", 1], ["c", 2]]);
    expect(fake.variants).toEqual([]);
    expect(fake.shots).toEqual([]);
    expect(fake.cast).toEqual([]);
  });

  it("有一格不存在时整次拒绝，不删除", async () => {
    const fake = createFake();

    await expect(writer(fake).remove(["b", "missing"])).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });

    expect(fake.panels).toHaveLength(3);
    expect(fake.locks).toEqual([]);
  });

  it("重复 id 或别的项目的分镜整次拒绝", async () => {
    const fake = createFake();
    fake.panels.push({ ...extra("foreign", "other-chapter", 1), project_id: OTHER });

    await expect(writer(fake).remove(["a", "a"])).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    await expect(writer(fake).remove(["foreign"])).rejects.toMatchObject({
      statusCode: 400,
      code: "PANEL_PROJECT_MISMATCH",
    });

    expect(fake.panels).toHaveLength(4);
    expect(fake.locks).toEqual([]);
  });
});
