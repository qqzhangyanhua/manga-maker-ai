import { describe, expect, it, vi } from "vitest";
import type { Prisma, PrismaClient } from "@prisma/client";

import { panels } from "./write";

const PROJECT = "33333333-3333-4333-8333-333333333333";
const OTHER = "33333333-3333-4333-8333-333333333334";
const CHAPTER = "22222222-2222-4222-8222-222222222222";
const PC1 = "55555555-5555-4555-8555-555555555555";
const PC2 = "66666666-6666-4666-8666-666666666666";
const OUTFIT = "99999999-9999-4999-8999-999999999999";
const OTHER_OUTFIT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PC = "55555555-5555-4555-8555-555555555556";

interface StoredPanel {
  id: string;
  project_id: string;
  chapter_id: string;
  panel_order: number;
  description: string;
  character_id?: string | null;
  outfit_id?: string | null;
  expression_type?: string | null;
  pipeline: boolean;
  created_at: string;
}

interface StoredCast {
  panel_id: string;
  project_character_id: string;
  outfit_id: string | null;
  expression_type: string | null;
  sort_order: number;
  pending_character_key: null;
  pending_character_name: null;
}

interface Fake {
  tx: Prisma.TransactionClient;
  panels: StoredPanel[];
  cast: StoredCast[];
  locks: string[];
  deletedCast: string[];
}

function createFake(): Fake {
  const chapters = new Map([
    [CHAPTER, { id: CHAPTER, project_id: PROJECT }],
    ["other-chapter", { id: "other-chapter", project_id: OTHER }],
  ]);
  const characters = [
    { id: PC1, project_id: PROJECT, outfits: [OUTFIT] },
    { id: PC2, project_id: PROJECT, outfits: [] as string[] },
    { id: OTHER_PC, project_id: OTHER, outfits: [] as string[] },
  ];
  const stored: StoredPanel[] = [
    { id: "a", project_id: PROJECT, chapter_id: CHAPTER, panel_order: 1, description: "甲", pipeline: true, created_at: "2026-01-01T00:00:00.000Z" },
    { id: "b", project_id: PROJECT, chapter_id: CHAPTER, panel_order: 2, description: "乙", pipeline: true, created_at: "2026-01-02T00:00:00.000Z" },
    { id: "c", project_id: PROJECT, chapter_id: CHAPTER, panel_order: 3, description: "丙", pipeline: true, created_at: "2026-01-03T00:00:00.000Z" },
  ];
  const cast: StoredCast[] = [];
  const locks: string[] = [];
  const deletedCast: string[] = [];
  let sequence = 0;

  const tx = {
    chapter: {
      findUnique: async (args: { where: { id: string } }) => chapters.get(args.where.id) ?? null,
    },
    panel: {
      findUnique: async (args: { where: { id: string } }) => stored.find((panel) => panel.id === args.where.id) ?? null,
      findMany: async (args: { where: { chapter_id: string } }) => stored
        .filter((panel) => panel.chapter_id === args.where.chapter_id)
        .sort((left, right) => left.panel_order - right.panel_order || left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id)),
      create: async (args: { data: StoredPanel & { pipeline_state?: { create: Record<string, never> } } }) => {
        sequence += 1;
        const created: StoredPanel = {
          ...args.data,
          id: `new-${sequence}`,
          pipeline: Boolean(args.data.pipeline_state),
          created_at: `2026-02-0${sequence}T00:00:00.000Z`,
        };
        stored.push(created);
        return { id: created.id };
      },
      update: async (args: { where: { id: string }; data: { panel_order?: number; character_id?: string | null } }) => {
        const panel = stored.find((item) => item.id === args.where.id);
        if (!panel) throw new Error("分镜不存在");
        Object.assign(panel, args.data);
        return panel;
      },
    },
    panelCharacter: {
      deleteMany: async (args: { where: { panel_id: string } }) => {
        deletedCast.push(args.where.panel_id);
        const before = cast.length;
        for (let index = cast.length - 1; index >= 0; index -= 1) {
          if (cast[index]?.panel_id === args.where.panel_id) cast.splice(index, 1);
        }
        return { count: before - cast.length };
      },
      createMany: async (args: { data: StoredCast[] }) => {
        cast.push(...args.data);
        return { count: args.data.length };
      },
    },
    projectCharacter: {
      findMany: async (args: { where: { id: { in: string[] }; project_id: string } }) => characters
        .filter((character) => character.project_id === args.where.project_id && args.where.id.in.includes(character.id))
        .map((character) => ({
          id: character.id,
          character: { outfits: character.outfits.map((id) => ({ id })) },
        })),
    },
    $executeRaw: async (_query: TemplateStringsArray, chapterId: string) => {
      locks.push(chapterId);
      return 0;
    },
  };

  return { tx: tx as unknown as Prisma.TransactionClient, panels: stored, cast, locks, deletedCast };
}

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
