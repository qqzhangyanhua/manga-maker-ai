import { describe, expect, it } from "vitest";

import { pendingCharacterKey } from "./pending-characters";
import { planPanelCharacters, toCanvasFinal } from "./shot-mapping";

const C1 = "11111111-1111-4111-8111-111111111111";
const C2 = "22222222-2222-4222-8222-222222222222";
const O1 = "33333333-3333-4333-8333-333333333333";
const O2 = "44444444-4444-4444-8444-444444444444";

describe("画布镜头映射", () => {
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
