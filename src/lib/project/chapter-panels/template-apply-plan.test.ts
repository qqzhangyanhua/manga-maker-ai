import { describe, expect, it } from "vitest";

import {
  planTemplateInsert,
  planTemplateReplace,
  templateShotInput,
  type KeptPanelRow,
} from "./template-apply-plan";

const CHAPTER_A = "chapter-a";
const CHAPTER_B = "chapter-b";

function row(id: string, chapterId: string, description: string, generatedImage: string | null = null): KeptPanelRow {
  return {
    id,
    chapter_id: chapterId,
    description,
    panel_type: "dialogue",
    importance: "medium",
    dialogue: null,
    camera_angle: null,
    shot_size: null,
    emotion: null,
    prompt_used: null,
    generated_image: generatedImage,
    character_name: null,
    sketch_image_url: null,
    script_segment_id: null,
    is_shared: false,
    shared_at: null,
    view_count: 0,
    show_prompt: true,
    segment_id: null,
    visual_prompt: null,
    negative_prompt: null,
    composition_hint: null,
    location_key: null,
    generation_status: null,
    scene_id: null,
    camera_movement: null,
    movement_speed: null,
    movement_direction: null,
    script_start: null,
    script_end: null,
    layout_hint: null,
  };
}

const template = [
  templateShotInput(
    { panel_type: "wide", camera_angle: "俯视", shot_size: "远景", importance: null },
    "从模板「追逐」生成的分镜 1",
  ),
  templateShotInput(
    { panel_type: null, camera_angle: null, shot_size: "特写", importance: "high" },
    "从模板「追逐」生成的分镜 2",
  ),
];

describe("应用模板时组装一章", () => {
  const panels = [
    row("a", CHAPTER_A, "甲", "http://img/a.png"),
    row("b", CHAPTER_A, "乙"),
    row("c", CHAPTER_B, "丙"),
  ];

  it("插在阅读顺序第 1 格之后，只重写这一章，原内容还在", () => {
    const plan = planTemplateInsert(panels, 1, template, "default");

    expect(plan.chapterId).toBe(CHAPTER_A);
    expect(plan.templateIndexes).toEqual([1, 2]);
    expect(plan.fields.map((field) => field.description)).toEqual([
      "甲",
      "从模板「追逐」生成的分镜 1",
      "从模板「追逐」生成的分镜 2",
      "乙",
    ]);
    expect(plan.fields[0]).toMatchObject({ generatedImage: "http://img/a.png", panelType: "dialogue" });
    expect(plan.fields[0]).not.toHaveProperty("characterId");
    expect(plan.fields[1]).toMatchObject({
      panelType: "wide",
      cameraAngle: "俯视",
      shotSize: "远景",
      importance: "medium",
      dialogue: null,
    });
    expect(plan.fields[2]).toMatchObject({ panelType: "medium", importance: "high", shotSize: "特写" });
  });

  it("位置小于等于 0 时插在第一章开头，超过末尾则接到最后一章", () => {
    expect(planTemplateInsert(panels, 0, template, "default").fields.map((field) => field.description)).toEqual([
      "从模板「追逐」生成的分镜 1",
      "从模板「追逐」生成的分镜 2",
      "甲",
      "乙",
    ]);
    expect(planTemplateInsert(panels, -1, template, "default").chapterId).toBe(CHAPTER_A);
    const appended = planTemplateInsert(panels, 9, template, "default");
    expect(appended.chapterId).toBe(CHAPTER_B);
    expect(appended.fields.map((field) => field.description)).toEqual([
      "丙",
      "从模板「追逐」生成的分镜 1",
      "从模板「追逐」生成的分镜 2",
    ]);
  });

  it("没有分镜时用默认章节，字段只有模板", () => {
    const plan = planTemplateInsert([], -1, template, "default");
    expect(plan).toEqual({
      chapterId: "default",
      fields: template,
      templateIndexes: [0, 1],
    });
  });

  it("替换时模板放在最先被替换的那格，其余格的内容留下", () => {
    const kept = row("b", CHAPTER_A, "乙", "http://img/b.png");
    kept.sketch_image_url = "http://img/b-sketch.png";
    kept.script_segment_id = "seg-json";
    kept.is_shared = true;
    kept.view_count = 4;
    kept.show_prompt = false;
    const chapter = [
      row("a", CHAPTER_A, "甲"),
      kept,
      row("c", CHAPTER_A, "丙"),
    ];
    const plan = planTemplateReplace(chapter, ["c", "a"], template);

    expect(plan.chapterId).toBe(CHAPTER_A);
    expect(plan.templateIndexes).toEqual([0, 1]);
    expect(plan.fields.map((field) => field.description)).toEqual([
      "从模板「追逐」生成的分镜 1",
      "从模板「追逐」生成的分镜 2",
      "乙",
    ]);
    expect(plan.fields[2]).toMatchObject({
      generatedImage: "http://img/b.png",
      sketchImageUrl: "http://img/b-sketch.png",
      scriptSegmentId: "seg-json",
      isShared: true,
      viewCount: 4,
      showPrompt: false,
    });
    expect(plan.fields[2]).not.toHaveProperty("characterId");
  });

  it("只换中间一格时，前后格还在，成图跟着走", () => {
    const plan = planTemplateReplace(
      [row("a", CHAPTER_A, "甲", "http://img/a.png"), row("b", CHAPTER_A, "乙"), row("c", CHAPTER_A, "丙")],
      ["b"],
      template.slice(0, 1),
    );

    expect(plan.fields.map((field) => field.description)).toEqual([
      "甲",
      "从模板「追逐」生成的分镜 1",
      "丙",
    ]);
    expect(plan.fields[0]?.generatedImage).toBe("http://img/a.png");
    expect(plan.templateIndexes).toEqual([1]);
  });
});
