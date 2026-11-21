import type { NewPanelInput } from "./session";

/** 生成结果上的蛇形字段。对白和运镜允许 null。 */
export interface GeneratedChapterPanel {
  description: string;
  visual_prompt?: string | null;
  dialogue?: string | null;
  panel_type: string;
  importance?: string | null;
  camera_angle?: string | null;
  shot_size?: string | null;
  camera_movement?: string | null;
  movement_speed?: string | null;
  movement_direction?: string | null;
}

/** 原路由用 `value || null` 的字段：缺省和空串都落成 null。 */
function orNull(value: string | null | undefined): string | null {
  return value || null;
}

/**
 * 映射成 NewPanelInput。
 * 对白、角度、景别、运镜沿用原来的 `|| null`。
 * 其余字段缺了就保持不写，不补 medium 之类的默认值。主角色也不在这里。
 */
export function chapterPanelFromGenerated(panel: GeneratedChapterPanel): NewPanelInput {
  const input: NewPanelInput = {
    description: panel.description,
    panelType: panel.panel_type,
    dialogue: orNull(panel.dialogue),
    cameraAngle: orNull(panel.camera_angle),
    shotSize: orNull(panel.shot_size),
    cameraMovement: orNull(panel.camera_movement),
    movementSpeed: orNull(panel.movement_speed),
    movementDirection: orNull(panel.movement_direction),
  };

  if (panel.visual_prompt !== undefined) {
    input.visualPrompt = panel.visual_prompt;
  }
  if (typeof panel.importance === "string") {
    input.importance = panel.importance;
  }

  return input;
}

/** findMany 不保证顺序，按写入返回的 id 排回生成顺序。缺行说明保存结果对不上。 */
export function panelsInWrittenOrder<T extends { id: string }>(
  ids: readonly string[],
  rows: readonly T[],
): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => {
    const row = byId.get(id);
    if (!row) {
      throw new Error("保存后的分镜不存在");
    }
    return row;
  });
}
