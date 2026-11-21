import { describe, expect, it } from "vitest";

import { planChapterRestores, snapshotPanelField } from "./restore-plan";

const CHAPTER_A = "chapter-a";
const CHAPTER_B = "chapter-b";

describe("按章节恢复分镜", () => {
  it("旧的项目编号按章节分组后，章内顺序与快照一致", () => {
    const panels = [
      { chapter_id: CHAPTER_A, panel_order: 10, description: "甲", panel_type: "wide" },
      { chapter_id: CHAPTER_B, panel_order: 11, description: "乙", panel_type: "medium" },
      { chapter_id: CHAPTER_A, panel_order: 30, description: "丙", panel_type: "closeup" },
      { chapter_id: CHAPTER_B, panel_order: 12, description: "丁", panel_type: "dialogue" },
    ].map((panel, index) => ({
      index,
      field: snapshotPanelField(panel, new Set()),
      chapterId: panel.chapter_id,
      panelOrder: panel.panel_order,
    }));

    const plans = planChapterRestores(panels, [CHAPTER_A, CHAPTER_B], CHAPTER_A);

    expect(plans.map((plan) => [plan.chapterId, plan.fields.map((field) => field.description)])).toEqual([
      [CHAPTER_A, ["甲", "丙"]],
      [CHAPTER_B, ["乙", "丁"]],
    ]);
  });

  it("快照里没有的章节也要替换成空，未知章节归到默认章节并按编号穿插", () => {
    const rain = snapshotPanelField(
      { chapter_id: "missing", panel_order: 1, description: "雨" },
      new Set(),
    );
    const street = snapshotPanelField(
      { chapter_id: CHAPTER_A, panel_order: 5, description: "街" },
      new Set(),
    );
    const plans = planChapterRestores(
      [
        { index: 0, chapterId: "missing", panelOrder: 1, field: rain },
        { index: 1, chapterId: CHAPTER_A, panelOrder: 5, field: street },
      ],
      [CHAPTER_A, CHAPTER_B],
      CHAPTER_A,
    );

    expect(plans).toEqual([
      { chapterId: CHAPTER_A, fields: [rain, street] },
      { chapterId: CHAPTER_B, fields: [] },
    ]);
  });

  it("编号相同时保持快照里的先后", () => {
    const first = snapshotPanelField({ chapter_id: CHAPTER_A, panel_order: 4, description: "先" }, new Set());
    const second = snapshotPanelField({ chapter_id: CHAPTER_A, panel_order: 4, description: "后" }, new Set());
    const plans = planChapterRestores(
      [
        { index: 0, chapterId: CHAPTER_A, panelOrder: 4, field: first },
        { index: 1, chapterId: CHAPTER_A, panelOrder: 4, field: second },
      ],
      [CHAPTER_A],
      CHAPTER_A,
    );

    expect(plans[0]?.fields.map((field) => field.description)).toEqual(["先", "后"]);
  });

  it("快照字段保留成图和角色名，不带主角色；片段不在恢复结果里就丢掉", () => {
    const field = snapshotPanelField(
      {
        description: "雨",
        panel_type: "wide",
        generated_image: "http://img/a.png",
        character_name: "小林",
        character_id: "lead-1",
        outfit_id: "outfit-1",
        expression_type: "happy",
        segment_id: "seg-kept",
        dialogue: "你好",
      },
      new Set(["seg-kept"]),
    );
    const dropped = snapshotPanelField(
      { segment_id: "seg-gone", panel_type: 12, description: 8 },
      new Set(),
    );

    expect(field).toEqual({
      segmentId: "seg-kept",
      panelType: "wide",
      importance: "medium",
      description: "雨",
      dialogue: "你好",
      cameraAngle: null,
      shotSize: null,
      emotion: null,
      promptUsed: null,
      generatedImage: "http://img/a.png",
      characterName: "小林",
    });
    expect(field).not.toHaveProperty("characterId");
    expect(field).not.toHaveProperty("character_id");
    expect(dropped).toMatchObject({
      segmentId: null,
      panelType: "medium",
      description: "无描述",
      generatedImage: null,
      characterName: null,
    });
  });
});
