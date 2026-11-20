import { describe, expect, it } from "vitest";

import { db } from "../../../test-db/harness";
import { executeSqlFile, reading, rollbackFile, seedProject } from "./chapter-panel-order-db";

describe("剧本片段换章节", () => {
  it("换章节后移出和移入的章节都从 1 连号", async () => {
    const { projectId } = await seedProject("chapter-panel-move");
    const source = await db.chapter.create({
      data: { project_id: projectId, title: "移出", chapter_order: 1 },
    });
    const target = await db.chapter.create({
      data: { project_id: projectId, title: "移入", chapter_order: 2 },
    });
    const segment = await db.scriptSegment.create({
      data: {
        chapter_id: source.id,
        segment_order: 1,
        content: "场面",
        scene_description: "教室",
        character_actions: "走进来",
      },
    });
    const kept = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: source.id,
        panel_order: 1,
        panel_type: "wide",
        importance: "medium",
        description: "留下",
        created_at: new Date("2020-02-01T00:00:00.000Z"),
      },
    });
    const moving = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: source.id,
        panel_order: 2,
        panel_type: "medium",
        importance: "medium",
        description: "跟着片段走",
        segment_id: segment.id,
        created_at: new Date("2020-02-02T00:00:00.000Z"),
      },
    });
    const trailing = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: source.id,
        panel_order: 3,
        panel_type: "closeup",
        importance: "low",
        description: "原来的第三格",
        created_at: new Date("2020-02-03T00:00:00.000Z"),
      },
    });
    const targetFirst = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: target.id,
        panel_order: 1,
        panel_type: "wide",
        importance: "medium",
        description: "目标第一章",
        created_at: new Date("2020-02-04T00:00:00.000Z"),
      },
    });
    const targetGap = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: target.id,
        panel_order: 4,
        panel_type: "medium",
        importance: "medium",
        description: "目标空号",
        created_at: new Date("2020-02-05T00:00:00.000Z"),
      },
    });

    await db.scriptSegment.update({
      where: { id: segment.id },
      data: { chapter_id: target.id },
    });

    expect(await reading(source.id)).toEqual([
      { id: kept.id, panel_order: 1 },
      { id: trailing.id, panel_order: 2 },
    ]);
    expect(await reading(target.id)).toEqual([
      { id: targetFirst.id, panel_order: 1 },
      { id: moving.id, panel_order: 2 },
      { id: targetGap.id, panel_order: 3 },
    ]);
  });

  it("只有镜头分镜离开时，移出和移入的章节都从 1 连号", async () => {
    const { projectId } = await seedProject("chapter-panel-shot-move");
    const source = await db.chapter.create({
      data: { project_id: projectId, title: "移出", chapter_order: 1 },
    });
    const target = await db.chapter.create({
      data: { project_id: projectId, title: "移入", chapter_order: 2 },
    });
    const segment = await db.scriptSegment.create({
      data: {
        chapter_id: source.id,
        segment_order: 1,
        content: "场面",
        scene_description: "操场",
        character_actions: "起跑",
      },
    });
    const kept = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: source.id,
        panel_order: 1,
        panel_type: "wide",
        importance: "medium",
        description: "留下",
        created_at: new Date("2020-03-01T00:00:00.000Z"),
      },
    });
    const moving = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: source.id,
        panel_order: 2,
        panel_type: "medium",
        importance: "medium",
        description: "镜头分镜",
        segment_id: segment.id,
        created_at: new Date("2020-03-02T00:00:00.000Z"),
      },
    });
    const trailing = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: source.id,
        panel_order: 3,
        panel_type: "closeup",
        importance: "low",
        description: "原来的第三格",
        created_at: new Date("2020-03-03T00:00:00.000Z"),
      },
    });
    const targetPanel = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: target.id,
        panel_order: 4,
        panel_type: "wide",
        importance: "medium",
        description: "目标空号",
        created_at: new Date("2020-03-04T00:00:00.000Z"),
      },
    });
    await db.shotDesign.create({
      data: {
        script_segment_id: segment.id,
        shot_order: 1,
        shot_description: "起跑",
        composition_hint: "居中",
        prompt: "start",
        panel_id: moving.id,
      },
    });

    expect(await reading(source.id)).toEqual([
      { id: kept.id, panel_order: 1 },
      { id: moving.id, panel_order: 2 },
      { id: trailing.id, panel_order: 3 },
    ]);

    await db.scriptSegment.update({
      where: { id: segment.id },
      data: { chapter_id: target.id },
    });

    expect(await reading(source.id)).toEqual([
      { id: kept.id, panel_order: 1 },
      { id: trailing.id, panel_order: 2 },
    ]);
    expect(await reading(target.id)).toEqual([
      { id: moving.id, panel_order: 1 },
      { id: targetPanel.id, panel_order: 2 },
    ]);
  });
});

describe("章节重编号回滚", () => {
  it("去掉主角色触发器，并恢复不重编移出章节的旧函数", async () => {
    const { userId, projectId } = await seedProject("chapter-panel-rollback");
    await executeSqlFile(rollbackFile);

    const triggers = await db.$queryRawUnsafe<Array<{ tgname: string }>>(
      "SELECT tgname FROM pg_trigger WHERE tgname = 'trg_panel_characters_sync_lead' AND NOT tgisinternal",
    );
    expect(triggers).toHaveLength(0);

    const definitions = await db.$queryRawUnsafe<Array<{ proname: string; def: string }>>(
      `SELECT p.proname, pg_get_functiondef(p.oid) AS def
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname IN (
           'canvas_renumber_chapter_panels',
           'canvas_move_segment_panels',
           'canvas_segment_panel_trigger'
         )`,
    );
    const defOf = (name: string) => definitions.find((row) => row.proname === name)?.def.replace(/\s+/g, " ").toLowerCase() ?? "";
    const renumber = defOf("canvas_renumber_chapter_panels");
    expect(renumber).toContain("timeline_chapters");
    expect(renumber).toContain("segment_id is null");
    expect(renumber).not.toContain("not exists (select 1 from shot_designs");
    expect(defOf("canvas_move_segment_panels")).not.toContain("canvas_renumber_chapter_panels");
    const segmentTrigger = defOf("canvas_segment_panel_trigger");
    expect(segmentTrigger).toContain("canvas_move_segment_panels");
    expect(segmentTrigger).not.toContain("array_agg");

    const member = await db.character.create({ data: { user_id: userId, name: "原主角色" } });
    const other = await db.character.create({ data: { user_id: userId, name: "在场角色" } });
    const otherRow = await db.projectCharacter.create({
      data: { project_id: projectId, character_id: other.id, role: "minor" },
    });
    const source = await db.chapter.create({
      data: { project_id: projectId, title: "移出", chapter_order: 1 },
    });
    const target = await db.chapter.create({
      data: { project_id: projectId, title: "移入", chapter_order: 2 },
    });
    const panel = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: source.id,
        panel_order: 1,
        panel_type: "medium",
        importance: "medium",
        description: "主角色不跟随",
        character_id: member.id,
        expression_type: "happy",
      },
    });
    await db.panelCharacter.create({
      data: {
        panel_id: panel.id,
        project_character_id: otherRow.id,
        expression_type: "angry",
        sort_order: 0,
      },
    });
    const unchanged = await db.panel.findUnique({ where: { id: panel.id } });
    expect(unchanged?.character_id).toBe(member.id);
    expect(unchanged?.expression_type).toBe("happy");

    const segment = await db.scriptSegment.create({
      data: {
        chapter_id: source.id,
        segment_order: 1,
        content: "场面",
        scene_description: "走廊",
        character_actions: "离开",
      },
    });
    await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: source.id,
        panel_order: 2,
        panel_type: "medium",
        importance: "medium",
        description: "跟着片段",
        segment_id: segment.id,
      },
    });
    const trailing = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: source.id,
        panel_order: 3,
        panel_type: "wide",
        importance: "low",
        description: "留在原章",
      },
    });
    const targetPanel = await db.panel.create({
      data: {
        project_id: projectId,
        chapter_id: target.id,
        panel_order: 4,
        panel_type: "wide",
        importance: "medium",
        description: "目标原有空号",
      },
    });

    await db.scriptSegment.update({
      where: { id: segment.id },
      data: { chapter_id: target.id },
    });

    const sourceOrders = await reading(source.id);
    expect(sourceOrders.map((row) => row.panel_order)).toEqual([1, 3]);
    expect(sourceOrders.map((row) => row.id)).toContain(trailing.id);
    const targetOrders = await reading(target.id);
    expect(targetOrders.map((row) => row.panel_order).sort((left, right) => left - right)).toEqual([2, 4]);
    expect(targetOrders.map((row) => row.id)).toContain(targetPanel.id);
  });
});
