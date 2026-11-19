import { describe, expect, it } from "vitest";

import { pendingCharacterKey } from "./pending-characters";
import { planPanelCharacters, toCanvasFinal, toCanvasShots } from "./shot-mapping";
import type { CanvasPanelRecord } from "./shot-mapping";

const C1 = "11111111-1111-4111-8111-111111111111";
const C2 = "22222222-2222-4222-8222-222222222222";
const O1 = "33333333-3333-4333-8333-333333333333";
const O2 = "44444444-4444-4444-8444-444444444444";

function panel(overrides: Partial<CanvasPanelRecord>): CanvasPanelRecord {
  return {
    id: "p",
    project_id: "proj",
    panel_order: 1,
    panel_type: "medium",
    importance: "medium",
    description: "描述",
    dialogue: null,
    character_name: null,
    emotion: null,
    generated_image: null,
    prompt_used: null,
    script_segment_id: null,
    script_start: null,
    script_end: null,
    camera_angle: null,
    shot_size: null,
    camera_movement: null,
    movement_speed: null,
    movement_direction: null,
    sketch_image_url: null,
    visual_prompt: null,
    character_id: null,
    expression_type: null,
    outfit_id: null,
    scene_id: null,
    chapter_id: "ch",
    layout_hint: null,
    segment_id: "s1",
    composition_hint: null,
    location_key: null,
    negative_prompt: null,
    generation_status: null,
    is_shared: false,
    shared_at: null,
    view_count: 0,
    show_prompt: true,
    created_at: new Date("2026-01-01T00:00:00Z"),
    panel_characters: [],
    pipeline_state: null,
    ...overrides,
  };
}

describe("画布镜头映射", () => {
  it("分镜转镜头：空字段给默认值，片段内序号按顺序从 1 开始", () => {
    const shots = toCanvasShots([
      panel({ id: "a", segment_id: "s1" }),
      panel({ id: "b", segment_id: "s1", camera_angle: "俯视", visual_prompt: "p", generation_status: "completed" }),
      panel({ id: "c", segment_id: "s2" }),
    ]);
    expect(shots.map((s) => [s.id, s.script_segment_id, s.shot_order])).toEqual([
      ["a", "s1", 1],
      ["b", "s1", 2],
      ["c", "s2", 1],
    ]);
    expect(shots[0]).toMatchObject({
      camera_angle: "",
      prompt: "",
      generation_status: "pending",
      character_ids: [],
      nine_grid_status: "pending",
      prompt_composition_id: null,
    });
    expect(shots[1]).toMatchObject({ camera_angle: "俯视", prompt: "p", generation_status: "completed" });
  });

  it("分镜角色转平行数组：已入库角色给角色 ID，待绑定给临时 ID", () => {
    const [shot] = toCanvasShots([
      panel({
        panel_characters: [
          {
            id: "pc1", panel_id: "p", project_character_id: "prc1", pending_character_key: null,
            pending_character_name: null, outfit_id: O1, expression_type: "happy", sort_order: 0,
            created_at: new Date(), project_character: { character_id: C1 },
          },
          {
            id: "pc2", panel_id: "p", project_character_id: null, pending_character_key: "unbound-n1",
            pending_character_name: "路人", outfit_id: null, expression_type: null, sort_order: 1,
            created_at: new Date(), project_character: null,
          },
        ],
        pipeline_state: {
          panel_id: "p", character_prompt_template_ids: ["t1"], prompt_composition_id: "comp",
          nine_grid_generation_id: null, character_prompt_status: "completed", final_prompt_status: "completed",
          nine_grid_status: "pending", selection_status: "selected", updated_at: new Date(),
        },
      }),
    ]);
    expect(shot.character_ids).toEqual([C1, "unbound-n1"]);
    expect(shot.outfit_ids).toEqual([O1, ""]);
    expect(shot.expression_types).toEqual(["happy", ""]);
    expect(shot).toMatchObject({ prompt_composition_id: "comp", selection_status: "selected" });
  });

  it("角色写入计划：去重、丢弃非本人角色、服装须属于该角色、待绑定带名称", () => {
    const plans = planPanelCharacters({
      characterIds: [C1, "made-up-id", "unbound-n1", C1, C2, " "],
      outfitIds: [O2, "", "", O1, O1],
      expressionTypes: ["happy", "", " sad ", "angry", ""],
      ownedCharacterIds: new Set([C1, C2]),
      outfitOwners: new Map([[O1, C1], [O2, C2]]),
      pendingNames: new Map([["unbound-n1", "路人"]]),
    });
    expect(plans).toEqual([
      { characterId: C1, pendingKey: null, pendingName: null, outfitId: null, expression: "happy", sortOrder: 0 },
      { characterId: null, pendingKey: "unbound-n1", pendingName: "路人", outfitId: null, expression: "sad", sortOrder: 1 },
      { characterId: C2, pendingKey: null, pendingName: null, outfitId: null, expression: null, sortOrder: 2 },
    ]);
  });

  it("最终漫画：尺寸从生成参数读取，缺省 1024x768", () => {
    const base = {
      id: "v", panel_id: "p", image_url: "u", prompt: "x", variant_type: "canvas_final",
      is_selected: false, created_at: new Date(), comic_panel_result_id: null,
    };
    expect(toCanvasFinal({ ...base, generation_params: { width: 800, height: 600 } })).toMatchObject({ width: 800, height: 600 });
    expect(toCanvasFinal({ ...base, generation_params: {} })).toMatchObject({ width: 1024, height: 768 });
  });

  it("待绑定临时 ID 与角色解析一致：有 ID 用 ID，否则用名称", () => {
    expect(pendingCharacterKey({ id: "n1", name: "张 三" })).toBe("unbound-n1");
    expect(pendingCharacterKey({ name: "Li  Si" })).toBe("unbound-li-si");
  });
});
