import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import type { CanvasShotContext } from "./context";
import { listChapterShots, updateCanvasShot } from "./shot-store";
import type { PanelCastWrite } from "./types";

const TIMELINE_CHAPTER = "11111111-1111-4111-8111-111111111111";
const PANEL_ID = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const SEGMENT_ID = "44444444-4444-4444-8444-444444444444";
const PC1 = "55555555-5555-4555-8555-555555555555";
const PC2 = "66666666-6666-4666-8666-666666666666";
const LIB1 = "77777777-7777-4777-8777-777777777777";
const LIB2 = "88888888-8888-4888-8888-888888888888";
const O1 = "99999999-9999-4999-8999-999999999999";
const O2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function createDb() {
  const db = {
    $transaction: vi.fn(),
    panel: { findMany: vi.fn(), update: vi.fn() },
    projectCharacter: { findMany: vi.fn() },
    panelCharacter: { deleteMany: vi.fn(), createMany: vi.fn() },
    scene: { findUnique: vi.fn() },
  };
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => Promise<void>) => fn(db));
  db.panel.update.mockResolvedValue({});
  db.panelCharacter.deleteMany.mockResolvedValue({ count: 0 });
  db.panelCharacter.createMany.mockResolvedValue({ count: 0 });
  return db;
}

const asClient = (db: ReturnType<typeof createDb>) => db as unknown as PrismaClient;

function context(): CanvasShotContext {
  return { panel: { id: PANEL_ID }, projectId: PROJECT_ID } as CanvasShotContext;
}

function panelRecord() {
  return {
    id: PANEL_ID,
    segment_id: SEGMENT_ID,
    panel_order: 4,
    camera_angle: "eye",
    shot_size: "medium",
    panel_type: "dialogue",
    description: "雨夜对峙",
    composition_hint: "对切",
    location_key: "street",
    scene_id: null,
    visual_prompt: "rain",
    negative_prompt: null,
    generated_image: null,
    generation_status: "pending",
    created_at: new Date("2026-01-02T00:00:00.000Z"),
    pipeline_state: null,
    panel_characters: [
      {
        sort_order: 2,
        project_character_id: null,
        outfit_id: null,
        expression_type: null,
        pending_character_key: "unbound-n1",
        pending_character_name: "路人",
        project_character: null,
      },
      {
        sort_order: 0,
        project_character_id: PC1,
        outfit_id: O1,
        expression_type: "happy",
        pending_character_key: null,
        pending_character_name: null,
        project_character: { character_id: LIB1 },
      },
      {
        sort_order: 1,
        project_character_id: PC2,
        outfit_id: null,
        expression_type: "angry",
        pending_character_key: null,
        pending_character_name: null,
        project_character: { character_id: LIB2 },
      },
    ],
  };
}

describe("画布分镜读写", () => {
  it("打开一格分镜时按顺序给出项目角色、服装和表情，待绑定行仍可读", async () => {
    const db = createDb();
    db.panel.findMany.mockResolvedValue([panelRecord()]);

    const shots = await listChapterShots(asClient(db), TIMELINE_CHAPTER);

    expect(db.panel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { segment: { timeline_chapter_id: TIMELINE_CHAPTER } },
      })
    );
    expect(shots).toHaveLength(1);
    expect(shots[0]).toMatchObject({
      id: PANEL_ID,
      segment_id: SEGMENT_ID,
      panel_order: 4,
      description: "雨夜对峙",
    });
    expect(shots[0]).not.toHaveProperty("shot_order");
    expect(shots[0]).not.toHaveProperty("shot_description");
    expect(shots[0]).not.toHaveProperty("script_segment_id");
    expect(shots[0]).not.toHaveProperty("character_ids");
    expect(shots[0].characters).toEqual([
      {
        project_character_id: PC1,
        outfit_id: O1,
        expression: "happy",
        pending_character_key: null,
        pending_character_name: null,
      },
      {
        project_character_id: PC2,
        outfit_id: null,
        expression: "angry",
        pending_character_key: null,
        pending_character_name: null,
      },
      {
        project_character_id: null,
        outfit_id: null,
        expression: null,
        pending_character_key: "unbound-n1",
        pending_character_name: "路人",
      },
    ]);
    expect(JSON.stringify(shots[0])).not.toContain(LIB1);
    expect(JSON.stringify(shots[0])).not.toContain(LIB2);
  });

  it("保存有序项目角色行，第一行成为主角色", async () => {
    const db = createDb();
    db.projectCharacter.findMany.mockResolvedValue([
      { id: PC1, character_id: LIB1, character: { outfits: [{ id: O1 }] } },
      { id: PC2, character_id: LIB2, character: { outfits: [{ id: O2 }] } },
    ]);

    await updateCanvasShot(asClient(db), context(), "user-1", {
      characters: [
        { project_character_id: PC2, outfit_id: O2, expression: "angry" },
        { project_character_id: PC1, outfit_id: null, expression: null },
      ],
    });

    expect(db.projectCharacter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [PC2, PC1] }, project_id: PROJECT_ID },
      })
    );
    expect(db.panel.update).toHaveBeenCalledWith({
      where: { id: PANEL_ID },
      data: expect.objectContaining({
        character_id: LIB2,
        outfit_id: O2,
        expression_type: "angry",
      }),
    });
    expect(db.panelCharacter.deleteMany).toHaveBeenCalledWith({ where: { panel_id: PANEL_ID } });
    expect(db.panelCharacter.createMany).toHaveBeenCalledWith({
      data: [
        {
          panel_id: PANEL_ID,
          project_character_id: PC2,
          outfit_id: O2,
          expression_type: "angry",
          sort_order: 0,
          pending_character_key: null,
          pending_character_name: null,
        },
        {
          panel_id: PANEL_ID,
          project_character_id: PC1,
          outfit_id: null,
          expression_type: null,
          sort_order: 1,
          pending_character_key: null,
          pending_character_name: null,
        },
      ],
    });
  });

  it("空的出场名单清空主角色", async () => {
    const db = createDb();

    await updateCanvasShot(asClient(db), context(), "user-1", { characters: [] });

    expect(db.projectCharacter.findMany).not.toHaveBeenCalled();
    expect(db.panel.update).toHaveBeenCalledWith({
      where: { id: PANEL_ID },
      data: { character_id: null, outfit_id: null, expression_type: null },
    });
    expect(db.panelCharacter.deleteMany).toHaveBeenCalledWith({ where: { panel_id: PANEL_ID } });
    expect(db.panelCharacter.createMany).not.toHaveBeenCalled();
  });

  it("只改描述时不动出场角色和主角色", async () => {
    const db = createDb();

    await updateCanvasShot(asClient(db), context(), "user-1", { description: "新描述" });

    expect(db.projectCharacter.findMany).not.toHaveBeenCalled();
    expect(db.panelCharacter.deleteMany).not.toHaveBeenCalled();
    expect(db.panel.update).toHaveBeenCalledWith({
      where: { id: PANEL_ID },
      data: { description: "新描述" },
    });
  });

  it.each([
    ["待绑定键", [{ project_character_id: "unbound-n1" }], "PROJECT_CHARACTER_REQUIRED"],
    ["重复的项目角色", [{ project_character_id: PC1 }, { project_character_id: PC1 }], "DUPLICATE_PROJECT_CHARACTER"],
  ] as const)("%s 整次拒绝，不写库", async (_label, characters, code) => {
    const db = createDb();

    await expect(
      updateCanvasShot(asClient(db), context(), "user-1", { characters: [...characters] })
    ).rejects.toMatchObject({ statusCode: 400, code });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.projectCharacter.findMany).not.toHaveBeenCalled();
  });

  it("项目角色不属于这个项目时整次拒绝，不写库", async () => {
    const db = createDb();
    db.projectCharacter.findMany.mockResolvedValue([]);
    const characters: PanelCastWrite[] = [{ project_character_id: PC1, outfit_id: O1, expression: "happy" }];

    await expect(updateCanvasShot(asClient(db), context(), "user-1", { characters })).rejects.toMatchObject({
      statusCode: 400,
      code: "PROJECT_CHARACTER_MISMATCH",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.panel.update).not.toHaveBeenCalled();
  });

  it("服装不属于该项目角色时整次拒绝，不写库", async () => {
    const db = createDb();
    db.projectCharacter.findMany.mockResolvedValue([
      { id: PC1, character_id: LIB1, character: { outfits: [{ id: O1 }] } },
    ]);

    await expect(
      updateCanvasShot(asClient(db), context(), "user-1", {
        characters: [{ project_character_id: PC1, outfit_id: O2, expression: "happy" }],
      })
    ).rejects.toMatchObject({ statusCode: 400, code: "OUTFIT_MISMATCH" });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.panel.update).not.toHaveBeenCalled();
  });
});
