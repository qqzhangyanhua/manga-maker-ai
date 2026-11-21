import { describe, expect, it } from "vitest";

import { chapterPanelFromGenerated, panelsInWrittenOrder } from "./from-generated";

describe("chapterPanelFromGenerated", () => {
  it("把蛇形字段映射成写入字段，空对白和空运镜写成 null", () => {
    expect(
      chapterPanelFromGenerated({
        description: "远景",
        visual_prompt: "wide street",
        dialogue: "你好",
        panel_type: "wide",
        importance: "high",
        camera_angle: "平视",
        shot_size: "远景",
        camera_movement: "static",
        movement_speed: "slow",
        movement_direction: "向前",
      }),
    ).toEqual({
      description: "远景",
      visualPrompt: "wide street",
      dialogue: "你好",
      panelType: "wide",
      importance: "high",
      cameraAngle: "平视",
      shotSize: "远景",
      cameraMovement: "static",
      movementSpeed: "slow",
      movementDirection: "向前",
    });

    expect(
      chapterPanelFromGenerated({
        description: "特写",
        visual_prompt: "",
        dialogue: "",
        panel_type: "closeup",
        importance: "low",
        camera_angle: "",
      }),
    ).toEqual({
      description: "特写",
      visualPrompt: "",
      dialogue: null,
      panelType: "closeup",
      importance: "low",
      cameraAngle: null,
      shotSize: null,
      cameraMovement: null,
      movementSpeed: null,
      movementDirection: null,
    });
  });

  it("缺省的画面提示和重要性不补默认值，也不抄主角色或编号", () => {
    const input = chapterPanelFromGenerated({
      description: "只有描述",
      panel_type: "medium",
      importance: null,
      visual_prompt: null,
    });

    expect(input.visualPrompt).toBeNull();
    expect(input).not.toHaveProperty("importance");
    expect(input).not.toHaveProperty("characterId");
    expect(input).not.toHaveProperty("panelOrder");
  });

  it("九宫格显式传入的 null 对白和运镜保持 null", () => {
    expect(
      chapterPanelFromGenerated({
        description: "九宫格",
        visual_prompt: "prompt",
        dialogue: null,
        panel_type: "action",
        importance: "medium",
        camera_angle: "俯视",
        shot_size: "中景",
        camera_movement: null,
        movement_speed: null,
        movement_direction: null,
      }),
    ).toEqual({
      description: "九宫格",
      visualPrompt: "prompt",
      dialogue: null,
      panelType: "action",
      importance: "medium",
      cameraAngle: "俯视",
      shotSize: "中景",
      cameraMovement: null,
      movementSpeed: null,
      movementDirection: null,
    });
  });
});

describe("panelsInWrittenOrder", () => {
  it("按写入 id 还原顺序，缺行就失败", () => {
    expect(panelsInWrittenOrder(["b", "a"], [{ id: "a", description: "甲" }, { id: "b", description: "乙" }])).toEqual([
      { id: "b", description: "乙" },
      { id: "a", description: "甲" },
    ]);
    expect(panelsInWrittenOrder([], [])).toEqual([]);
    expect(() => panelsInWrittenOrder(["missing"], [])).toThrow("保存后的分镜不存在");
  });
});
