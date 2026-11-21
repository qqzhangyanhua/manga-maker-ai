import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { panels } from "./write";
import {
  CHAPTER,
  OTHER,
  OTHER_OUTFIT,
  OTHER_PC,
  OUTFIT,
  PC1,
  PC2,
  PROJECT,
  createFake,
  type Fake,
} from "./write-fake";

const writer = (fake: Fake) => panels(PROJECT, { tx: fake.tx });

describe("章节分镜写入", () => {
  it("插到中间时后移后面的分镜，新分镜属于该项目并带一行流程状态", async () => {
    const fake = createFake();

    const created = await writer(fake).add(
      [
        { panelType: "dialogue", description: "新一" },
        { panelType: "closeup", description: "新二" },
      ],
      { chapter: CHAPTER, index: 1 },
    );

    expect(created.map((panel) => panel.panelOrder)).toEqual([2, 3]);
    expect(fake.locks).toEqual([CHAPTER]);
    expect(fake.panels.map((panel) => [panel.id, panel.panel_order, panel.description])).toEqual([
      ["a", 1, "甲"],
      ["b", 4, "乙"],
      ["c", 5, "丙"],
      ["new-1", 2, "新一"],
      ["new-2", 3, "新二"],
    ]);
    const inserted = fake.panels.filter((panel) => panel.id.startsWith("new-"));
    expect(inserted.every((panel) => panel.project_id === PROJECT && panel.chapter_id === CHAPTER && panel.pipeline)).toBe(true);
    expect(inserted.every((panel) => panel.character_id === undefined && panel.outfit_id === undefined && panel.expression_type === undefined)).toBe(true);
  });

  it("不写下标时追加到章节尾部", async () => {
    const fake = createFake();

    const created = await writer(fake).add(
      { panelType: "wide", description: "结尾" },
      { chapter: CHAPTER },
    );

    expect(created).toEqual([{ id: "new-1", panelOrder: 4 }]);
    expect(fake.panels.find((panel) => panel.id === "a")?.panel_order).toBe(1);
  });

  it("放在某一格之后时，编号跟那一格所在的章节走", async () => {
    const fake = createFake();

    const created = await writer(fake).add(
      { panelType: "action", description: "插入" },
      { after: "b" },
    );

    expect(created).toEqual([{ id: "new-1", panelOrder: 3 }]);
    expect(fake.locks).toEqual([CHAPTER]);
  });

  it("设置在场角色时按顺序写入，不改主角色字段", async () => {
    const fake = createFake();

    await writer(fake).setCast("b", [
      { projectCharacterId: PC2, expression: "angry" },
      { projectCharacterId: PC1, outfitId: OUTFIT, expression: "happy" },
    ]);

    expect(fake.deletedCast).toEqual(["b"]);
    expect(fake.cast).toEqual([
      {
        panel_id: "b",
        project_character_id: PC2,
        outfit_id: null,
        expression_type: "angry",
        sort_order: 0,
        pending_character_key: null,
        pending_character_name: null,
      },
      {
        panel_id: "b",
        project_character_id: PC1,
        outfit_id: OUTFIT,
        expression_type: "happy",
        sort_order: 1,
        pending_character_key: null,
        pending_character_name: null,
      },
    ]);
    expect(fake.panels.find((panel) => panel.id === "b")).not.toHaveProperty("character_id");
  });

  it("空的在场角色会清掉原有行", async () => {
    const fake = createFake();
    fake.cast.push({
      panel_id: "a",
      project_character_id: PC1,
      outfit_id: null,
      expression_type: null,
      sort_order: 0,
      pending_character_key: null,
      pending_character_name: null,
    });

    await writer(fake).setCast("a", []);

    expect(fake.cast).toEqual([]);
  });

  it("不传事务时自己开事务", async () => {
    const fake = createFake();
    const db = {
      $transaction: vi.fn(async (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) => fn(fake.tx)),
    };

    await panels(PROJECT, { db: db as unknown as PrismaClient }).add(
      { panelType: "medium", description: "独立事务" },
      { chapter: CHAPTER },
    );

    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(fake.panels.some((panel) => panel.description === "独立事务")).toBe(true);
  });

  it.each([
    ["章节不存在", { chapter: "missing" }, { statusCode: 404, code: "NOT_FOUND" }],
    ["章节属于别的项目", { chapter: "other-chapter" }, { statusCode: 400, code: "CHAPTER_PROJECT_MISMATCH" }],
    ["锚点分镜不存在", { after: "missing" }, { statusCode: 404, code: "NOT_FOUND" }],
    ["锚点分镜属于别的项目", { before: "foreign" }, { statusCode: 400, code: "PANEL_PROJECT_MISMATCH" }],
  ] as const)("%s 时拒绝添加", async (_label, where, error) => {
    const fake = createFake();
    fake.panels.push({
      id: "foreign",
      project_id: OTHER,
      chapter_id: "other-chapter",
      panel_order: 1,
      description: "别人的",
      pipeline: true,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    const before = fake.panels.length;

    await expect(writer(fake).add({ panelType: "medium", description: "不该写下" }, where)).rejects.toMatchObject(error);

    expect(fake.panels).toHaveLength(before);
    expect(fake.locks).toEqual([]);
  });

  it("重复的在场角色整次拒绝", async () => {
    const fake = createFake();

    await expect(writer(fake).setCast("a", [
      { projectCharacterId: PC1 },
      { projectCharacterId: PC1 },
    ])).rejects.toMatchObject({ statusCode: 400, code: "DUPLICATE_PROJECT_CHARACTER" });

    expect(fake.deletedCast).toEqual([]);
  });

  it("不是项目角色的 id 整次拒绝", async () => {
    const fake = createFake();

    await expect(writer(fake).setCast("a", [
      { projectCharacterId: "unbound-n1" },
    ])).rejects.toMatchObject({ statusCode: 400, code: "PROJECT_CHARACTER_REQUIRED" });
    expect(fake.deletedCast).toEqual([]);
  });

  it("别的项目的角色整次拒绝", async () => {
    const fake = createFake();

    await expect(writer(fake).setCast("a", [
      { projectCharacterId: OTHER_PC },
    ])).rejects.toMatchObject({ statusCode: 400, code: "PROJECT_CHARACTER_MISMATCH" });
    expect(fake.deletedCast).toEqual([]);
  });

  it("不属于该角色的服装整次拒绝", async () => {
    const fake = createFake();

    await expect(writer(fake).setCast("a", [
      { projectCharacterId: PC1, outfitId: OTHER_OUTFIT },
    ])).rejects.toMatchObject({ statusCode: 400, code: "OUTFIT_MISMATCH" });
    expect(fake.deletedCast).toEqual([]);
  });

  it("分镜不存在或不属于该项目时拒绝设置在场角色", async () => {
    const fake = createFake();
    fake.panels.push({
      id: "foreign",
      project_id: OTHER,
      chapter_id: "other-chapter",
      panel_order: 1,
      description: "别人的",
      pipeline: true,
      created_at: "2026-01-01T00:00:00.000Z",
    });

    await expect(writer(fake).setCast("missing", [])).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
    await expect(writer(fake).setCast("foreign", [])).rejects.toMatchObject({
      statusCode: 400,
      code: "PANEL_PROJECT_MISMATCH",
    });
    expect(fake.deletedCast).toEqual([]);
  });
});
