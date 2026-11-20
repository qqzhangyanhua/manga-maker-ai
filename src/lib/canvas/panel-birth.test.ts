import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import type { AnchoredCanvasChapter } from "./context";
import { birthChapterPanels } from "./panel-birth";
import type { PlannedPanelFields } from "./panel-birth";

const TIMELINE_CHAPTER = "11111111-1111-4111-8111-111111111111";
const PROJECT_CHAPTER = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const SEGMENT_ID = "44444444-4444-4444-8444-444444444444";
const SEGMENT_2 = "44444444-4444-4444-8444-444444444445";
const PC1 = "55555555-5555-4555-8555-555555555555";
const PC_NEW = "55555555-5555-4555-8555-555555555556";
const LIB1 = "77777777-7777-4777-8777-777777777777";
const LIB2 = "88888888-8888-4888-8888-888888888888";
const STORY_ID = "99999999-9999-4999-8999-999999999999";
const UNKNOWN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PANEL_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const PANEL_B = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const USER_ID = "user-1";

function createDb() {
  const storedPanels: ReturnType<typeof storedPanel>[] = [];
  const projectCharacters = [
    { id: PC1, character_id: LIB1, character: { outfits: [] as Array<{ id: string }> } },
  ];
  const db = {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    character: { findMany: vi.fn() },
    project: { findUnique: vi.fn() },
    projectCharacter: { findMany: vi.fn(), create: vi.fn() },
    suggestedCharacter: { findMany: vi.fn(), create: vi.fn() },
    scriptSegment: { count: vi.fn() },
    chapter: { findUnique: vi.fn() },
    panel: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    panelCharacter: { createMany: vi.fn(), deleteMany: vi.fn() },
    storedPanels,
  };
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db));
  db.$executeRaw.mockResolvedValue(0);
  db.scriptSegment.count.mockImplementation(async (args: { where: { id: { in: string[] } } }) => args.where.id.in.length);
  db.chapter.findUnique.mockResolvedValue({ id: PROJECT_CHAPTER, project_id: PROJECT_ID });
  db.panel.create.mockResolvedValue({ id: PANEL_A });
  db.panel.findUnique.mockImplementation(async (args: { where: { id: string } }) => ({
    id: args.where.id,
    project_id: PROJECT_ID,
    chapter_id: PROJECT_CHAPTER,
  }));
  db.panel.findMany.mockImplementation(async (args: { select?: unknown }) => {
    if (args?.select) {
      const created = [
        { id: PANEL_A, project_id: PROJECT_ID, panel_order: 4 },
        { id: PANEL_B, project_id: PROJECT_ID, panel_order: 5 },
      ].slice(0, db.panel.create.mock.calls.length);
      return [
        { id: "existing-1", project_id: PROJECT_ID, panel_order: 1 },
        { id: "existing-2", project_id: PROJECT_ID, panel_order: 2 },
        { id: "existing-3", project_id: PROJECT_ID, panel_order: 3 },
        ...created,
      ];
    }
    return storedPanels;
  });
  db.panel.update.mockResolvedValue({});
  db.panelCharacter.createMany.mockResolvedValue({ count: 0 });
  db.panelCharacter.deleteMany.mockResolvedValue({ count: 0 });
  db.projectCharacter.create.mockImplementation(async () => {
    projectCharacters.push({ id: PC_NEW, character_id: LIB2, character: { outfits: [] } });
    return { id: PC_NEW };
  });
  db.projectCharacter.findMany.mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) => {
    const ids = args.where?.id?.in;
    if (!ids) return projectCharacters;
    return projectCharacters.filter((row) => ids.includes(row.id));
  });
  db.character.findMany.mockResolvedValue([
    { id: LIB1, name: "林晓" },
    { id: LIB2, name: "Alice" },
  ]);
  db.project.findUnique.mockResolvedValue({ story_id: STORY_ID });
  db.suggestedCharacter.findMany.mockResolvedValue([]);
  db.suggestedCharacter.create.mockResolvedValue({ id: "suggested-1" });
  return db;
}

const asClient = (db: ReturnType<typeof createDb>) => db as unknown as PrismaClient;

function chapter(): AnchoredCanvasChapter {
  return {
    timelineChapterId: TIMELINE_CHAPTER,
    timelineId: "timeline-1",
    novelProjectId: "novel-1",
    projectId: PROJECT_ID,
    projectChapterId: PROJECT_CHAPTER,
  };
}

function segment(id = SEGMENT_ID, content = "雨夜里，林晓推开门。") {
  return { id, content, scene_description: "旧街", character_actions: "推门" };
}

function planned(overrides: Partial<PlannedPanelFields> = {}): PlannedPanelFields {
  return {
    shot_order: 1,
    camera_angle: "平视",
    shot_size: "中景",
    panel_type: "dialogue",
    shot_description: "林晓推开门",
    composition_hint: "门框构图",
    character_ids: [LIB1],
    expression_types: ["happy"],
    prompt: "rain street",
    negative_prompt: "blurry",
    location_key: "street",
    ...overrides,
  };
}

function storedPanel(id: string, characters: Array<{ project_character_id: string; expression: string | null }>) {
  return {
    id,
    segment_id: SEGMENT_ID,
    panel_order: 4,
    camera_angle: "平视",
    shot_size: "中景",
    panel_type: "dialogue",
    description: "林晓推开门",
    composition_hint: "门框构图",
    location_key: "street",
    scene_id: null,
    visual_prompt: "rain street",
    negative_prompt: "blurry",
    generated_image: null,
    generation_status: "pending",
    created_at: new Date("2026-01-02T00:00:00.000Z"),
    pipeline_state: null,
    panel_characters: characters.map((row, index) => ({
      sort_order: index,
      project_character_id: row.project_character_id,
      outfit_id: null,
      expression_type: row.expression,
      pending_character_key: null,
      pending_character_name: null,
      project_character: { character_id: LIB1 },
    })),
  };
}

describe("从一章小说生成分镜", () => {
  it("把整个角色库交给规划器，已在项目里的角色按规划字段直接入镜", async () => {
    const db = createDb();
    db.storedPanels.push(storedPanel(PANEL_A, [{ project_character_id: PC1, expression: "happy" }]));
    const plan = vi.fn().mockResolvedValue([planned()]);

    const result = await birthChapterPanels(asClient(db), {
      chapter: chapter(),
      userId: USER_ID,
      segments: [segment()],
      plan,
    });

    expect(db.character.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { user_id: USER_ID },
    }));
    expect(plan).toHaveBeenCalledWith({
      script_content: "雨夜里，林晓推开门。",
      scene_description: "旧街",
      character_actions: "推门",
      available_characters: [
        { id: LIB1, name: "林晓" },
        { id: LIB2, name: "Alice" },
      ],
    });
    expect(db.projectCharacter.create).not.toHaveBeenCalled();
    expect(db.panel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        project_id: PROJECT_ID,
        chapter_id: PROJECT_CHAPTER,
        segment_id: SEGMENT_ID,
        panel_order: 4,
        panel_type: "dialogue",
        description: "林晓推开门",
        composition_hint: "门框构图",
        location_key: "street",
        visual_prompt: "rain street",
        negative_prompt: "blurry",
        camera_angle: "平视",
        shot_size: "中景",
        pipeline_state: { create: {} },
      }),
      select: { id: true },
    });
    const writtenPanel = db.panel.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(writtenPanel.data).not.toHaveProperty("character_id");
    expect(writtenPanel.data).not.toHaveProperty("outfit_id");
    expect(writtenPanel.data).not.toHaveProperty("expression_type");
    expect(db.panelCharacter.createMany).toHaveBeenCalledWith({
      data: [
        {
          panel_id: PANEL_A,
          project_character_id: PC1,
          outfit_id: null,
          expression_type: "happy",
          sort_order: 0,
          pending_character_key: null,
          pending_character_name: null,
        },
      ],
    });
    expect(result.skipped).toEqual([]);
    expect(result.panels).toHaveLength(1);
    expect(result.panels[0].characters[0]).toMatchObject({
      project_character_id: PC1,
      expression: "happy",
      pending_character_key: null,
    });
  });

  it("角色库里尚未入项的人先成为配角项目角色，同一格重复的角色库 id 只留第一次", async () => {
    const db = createDb();
    const plan = vi.fn().mockResolvedValue([
      planned({
        character_ids: [LIB2, LIB2],
        expression_types: ["happy", "sad"],
      }),
    ]);

    await birthChapterPanels(asClient(db), {
      chapter: chapter(),
      userId: USER_ID,
      segments: [segment()],
      plan,
    });

    expect(db.projectCharacter.create).toHaveBeenCalledTimes(1);
    expect(db.projectCharacter.create).toHaveBeenCalledWith({
      data: { project_id: PROJECT_ID, character_id: LIB2, role: "minor" },
      select: { id: true },
    });
    expect(db.panelCharacter.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          project_character_id: PC_NEW,
          expression_type: "happy",
          sort_order: 0,
          pending_character_key: null,
        }),
      ],
    });
  });

  it("名字对上角色库的人入镜，表情按下标对齐，被拿掉的人连表情一起拿掉", async () => {
    const db = createDb();
    const plan = vi.fn().mockResolvedValue([
      planned({
        character_ids: ["alice", "路人甲", LIB1],
        expression_types: ["surprised"],
      }),
    ]);

    await birthChapterPanels(asClient(db), {
      chapter: chapter(),
      userId: USER_ID,
      segments: [segment()],
      plan,
    });

    expect(db.panelCharacter.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          project_character_id: PC_NEW,
          expression_type: "surprised",
          sort_order: 0,
        }),
        expect.objectContaining({
          project_character_id: PC1,
          expression_type: null,
          sort_order: 1,
        }),
      ],
    });
    const writtenPanel = db.panel.create.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(writtenPanel.data).not.toHaveProperty("character_id");
    expect(writtenPanel.data).not.toHaveProperty("expression_type");
  });

  it("对不上角色库的人不入镜；有故事时同一个名字只留一条建议角色", async () => {
    const db = createDb();
    db.panel.create.mockResolvedValueOnce({ id: PANEL_A }).mockResolvedValueOnce({ id: PANEL_B });
    db.storedPanels.push(
      storedPanel(PANEL_A, [{ project_character_id: PC1, expression: "happy" }]),
      storedPanel(PANEL_B, []),
    );
    const plan = vi.fn().mockResolvedValue([
      planned({ character_ids: [LIB1, "路人甲", UNKNOWN_ID], expression_types: ["happy", "sad", "angry"] }),
      planned({ shot_order: 2, character_ids: ["路人甲", "路人乙"], expression_types: [] }),
    ]);

    const result = await birthChapterPanels(asClient(db), {
      chapter: chapter(),
      userId: USER_ID,
      segments: [segment()],
      plan,
    });

    expect(result.panels.map((panel) => panel.characters.map((row) => row.project_character_id))).toEqual([[PC1], []]);
    expect(JSON.stringify(result.panels)).not.toContain(UNKNOWN_ID);
    expect(db.panel.create).toHaveBeenCalledTimes(2);
    expect(db.suggestedCharacter.create).toHaveBeenCalledTimes(2);
    expect(db.suggestedCharacter.create).toHaveBeenNthCalledWith(1, {
      data: {
        story_id: STORY_ID,
        project_id: PROJECT_ID,
        name: "路人甲",
        description: "路人甲",
        appearance: "路人甲",
      },
    });
    expect(db.suggestedCharacter.create).toHaveBeenNthCalledWith(2, {
      data: {
        story_id: STORY_ID,
        project_id: PROJECT_ID,
        name: "路人乙",
        description: "路人乙",
        appearance: "路人乙",
      },
    });
    const written = JSON.stringify(db.panelCharacter.createMany.mock.calls);
    expect(written).not.toContain("路人甲");
    expect(written).not.toContain(UNKNOWN_ID);
    expect(written).not.toContain("unbound-");
  });

  it("已经有同名建议角色时不再新建", async () => {
    const db = createDb();
    db.suggestedCharacter.findMany.mockResolvedValue([{ name: "路人甲" }]);
    const plan = vi.fn().mockResolvedValue([
      planned({ character_ids: ["路人甲"] }),
    ]);

    await birthChapterPanels(asClient(db), {
      chapter: chapter(),
      userId: USER_ID,
      segments: [segment()],
      plan,
    });

    expect(db.suggestedCharacter.create).not.toHaveBeenCalled();
    expect(db.panel.create).toHaveBeenCalledTimes(1);
    expect(db.panelCharacter.createMany).not.toHaveBeenCalled();
  });

  it("没有故事时不建建议角色，格子仍然写下", async () => {
    const db = createDb();
    db.project.findUnique.mockResolvedValue({ story_id: null });
    const plan = vi.fn().mockResolvedValue([
      planned({ character_ids: ["路人甲", PC1], expression_types: ["sad", "happy"] }),
    ]);

    await birthChapterPanels(asClient(db), {
      chapter: chapter(),
      userId: USER_ID,
      segments: [segment()],
      plan,
    });

    expect(db.suggestedCharacter.findMany).not.toHaveBeenCalled();
    expect(db.suggestedCharacter.create).not.toHaveBeenCalled();
    expect(db.panel.create).toHaveBeenCalledTimes(1);
    expect(db.panelCharacter.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ project_character_id: PC1, expression_type: "happy" }),
      ],
    });
  });

  it("没有描述或格子类型不在已有取值里时跳过该格，其余格子照常写下", async () => {
    const db = createDb();
    db.panel.create.mockResolvedValueOnce({ id: PANEL_B });
    const plan = vi.fn()
      .mockResolvedValueOnce([
        {
          ...planned({ shot_order: 2, shot_description: "  ", panel_type: "dialogue" }),
          action_description: "不该被当成描述",
        },
        {
          ...planned({ shot_order: 3, shot_description: "有描述", panel_type: "establishing" }),
          shot_type: "dialogue",
        },
        planned({ shot_order: 4, shot_description: "", panel_type: "wide-shot" }),
      ])
      .mockResolvedValueOnce([
        planned({
          shot_order: 1,
          panel_type: "closeup",
          shot_description: "特写眼睛",
          character_ids: [],
          expression_types: [],
          prompt: "eyes",
          negative_prompt: "",
          composition_hint: "",
          location_key: "",
        }),
      ]);

    const result = await birthChapterPanels(asClient(db), {
      chapter: chapter(),
      userId: USER_ID,
      segments: [segment(), segment(SEGMENT_2, "第二段")],
      plan,
    });

    expect(result.skipped).toEqual([
      { segment_id: SEGMENT_ID, shot_order: 2, reason: "没有描述" },
      { segment_id: SEGMENT_ID, shot_order: 3, reason: "格子类型「establishing」不在分镜已有取值里" },
      { segment_id: SEGMENT_ID, shot_order: 4, reason: "没有描述；格子类型「wide-shot」不在分镜已有取值里" },
    ]);
    expect(db.panel.create).toHaveBeenCalledTimes(1);
    expect(db.panel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        segment_id: SEGMENT_2,
        panel_type: "closeup",
        description: "特写眼睛",
        visual_prompt: "eyes",
        negative_prompt: null,
        composition_hint: null,
        location_key: null,
      }),
      select: { id: true },
    });
    const writtenTypes = db.panel.create.mock.calls.map((call) => {
      const arg = call[0] as { data: { panel_type: string } };
      return arg.data.panel_type;
    });
    expect(writtenTypes).toEqual(["closeup"]);
  });

  it("剧本片段不属于这一章时整次拒绝，不调用规划器", async () => {
    const db = createDb();
    db.scriptSegment.count.mockResolvedValue(0);
    const plan = vi.fn();

    await expect(birthChapterPanels(asClient(db), {
      chapter: chapter(),
      userId: USER_ID,
      segments: [segment()],
      plan,
    })).rejects.toMatchObject({ statusCode: 400, code: "SEGMENT_CHAPTER_MISMATCH" });

    expect(plan).not.toHaveBeenCalled();
    expect(db.character.findMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("规划调用失败时整次失败，不写分镜", async () => {
    const db = createDb();
    const plan = vi.fn().mockRejectedValue(new Error("规划服务不可用"));

    await expect(birthChapterPanels(asClient(db), {
      chapter: chapter(),
      userId: USER_ID,
      segments: [segment(), segment(SEGMENT_2, "第二段")],
      plan,
    })).rejects.toThrow("规划服务不可用");

    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.panel.create).not.toHaveBeenCalled();
    expect(db.projectCharacter.create).not.toHaveBeenCalled();
    expect(db.suggestedCharacter.create).not.toHaveBeenCalled();
  });

  it("一格都没写上时整次失败，不写分镜", async () => {
    const db = createDb();
    const empty = vi.fn().mockResolvedValue([]);
    await expect(birthChapterPanels(asClient(db), {
      chapter: chapter(),
      userId: USER_ID,
      segments: [segment()],
      plan: empty,
    })).rejects.toMatchObject({ code: "NO_PANELS_WRITTEN", statusCode: 422, skipped: [] });

    const skipped = vi.fn().mockResolvedValue([
      planned({ shot_description: "", panel_type: "dialogue" }),
    ]);
    await expect(birthChapterPanels(asClient(db), {
      chapter: chapter(),
      userId: USER_ID,
      segments: [segment()],
      plan: skipped,
    })).rejects.toMatchObject({
      code: "NO_PANELS_WRITTEN",
      skipped: [{ segment_id: SEGMENT_ID, shot_order: 1, reason: "没有描述" }],
    });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.panel.create).not.toHaveBeenCalled();
    expect(db.suggestedCharacter.create).not.toHaveBeenCalled();
  });
});
