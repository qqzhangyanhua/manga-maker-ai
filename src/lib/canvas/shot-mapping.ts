import type { PanelVariant, Prisma } from "@prisma/client";
import type { CanvasFinal, CanvasShot, PanelCharacterPlan } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PENDING_CHARACTER_PREFIX = "unbound-";

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export const canvasShotInclude = {
  panel_characters: {
    orderBy: { sort_order: "asc" },
    include: { project_character: { select: { character_id: true } } },
  },
  pipeline_state: true,
} satisfies Prisma.PanelInclude;

export type CanvasPanelRecord = Prisma.PanelGetPayload<{ include: typeof canvasShotInclude }>;

export function toCanvasShot(panel: CanvasPanelRecord): CanvasShot {
  const characters = [...panel.panel_characters]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((pc) => ({
      project_character_id: pc.project_character_id,
      outfit_id: pc.outfit_id,
      expression: pc.expression_type,
      pending_character_key: pc.pending_character_key,
      pending_character_name: pc.pending_character_name,
    }));
  const state = panel.pipeline_state;

  return {
    id: panel.id,
    segment_id: panel.segment_id ?? "",
    panel_order: panel.panel_order,
    camera_angle: panel.camera_angle ?? "",
    shot_size: panel.shot_size ?? "",
    panel_type: panel.panel_type,
    description: panel.description,
    composition_hint: panel.composition_hint ?? "",
    location_key: panel.location_key ?? "",
    characters,
    scene_id: panel.scene_id,
    prompt: panel.visual_prompt ?? "",
    negative_prompt: panel.negative_prompt,
    generated_image_url: panel.generated_image,
    generation_status: panel.generation_status ?? "pending",
    character_prompt_template_ids: state?.character_prompt_template_ids ?? [],
    prompt_composition_id: state?.prompt_composition_id ?? null,
    nine_grid_generation_id: state?.nine_grid_generation_id ?? null,
    character_prompt_status: state?.character_prompt_status ?? "pending",
    final_prompt_status: state?.final_prompt_status ?? "pending",
    nine_grid_status: state?.nine_grid_status ?? "pending",
    selection_status: state?.selection_status ?? "pending",
    created_at: panel.created_at,
  };
}

/** 分镜列表转为画布读取结果。顺序用分镜自己的 panel_order，不再另算片段内序号。 */
export function toCanvasShots(panels: CanvasPanelRecord[]): CanvasShot[] {
  return panels.map((panel) => toCanvasShot(panel));
}

function readDimension(params: Prisma.JsonValue, key: "width" | "height", fallback: number): number {
  if (params && typeof params === "object" && !Array.isArray(params)) {
    const value = params[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return fallback;
}

export function toCanvasFinal(variant: PanelVariant): CanvasFinal {
  return {
    id: variant.id,
    panel_id: variant.panel_id,
    image_url: variant.image_url,
    prompt: variant.prompt,
    width: readDimension(variant.generation_params, "width", 1024),
    height: readDimension(variant.generation_params, "height", 768),
    is_selected: variant.is_selected,
    status: "completed",
    created_at: variant.created_at,
  };
}

/**
 * 把画布的平行数组（角色、服装、表情）整理成分镜角色行：
 * 属于项目所有者角色库的角色写成项目角色，unbound-xxx 写成待绑定，其余（模型编造的 ID 等）丢弃；
 * 同一角色只保留第一次出现；服装只保留属于该角色的。
 */
export function planPanelCharacters(params: {
  characterIds: string[];
  outfitIds?: string[];
  expressionTypes?: string[];
  ownedCharacterIds: Set<string>;
  outfitOwners: Map<string, string>;
  pendingNames?: Map<string, string>;
}): PanelCharacterPlan[] {
  const seen = new Set<string>();
  const plans: PanelCharacterPlan[] = [];
  params.characterIds.forEach((rawId, index) => {
    const id = rawId.trim();
    if (!id || seen.has(id)) return;
    const expression = params.expressionTypes?.[index]?.trim() || null;
    const outfitRaw = params.outfitIds?.[index]?.trim() || "";

    if (params.ownedCharacterIds.has(id)) {
      seen.add(id);
      plans.push({
        characterId: id,
        pendingKey: null,
        pendingName: null,
        outfitId: outfitRaw && params.outfitOwners.get(outfitRaw) === id ? outfitRaw : null,
        expression,
        sortOrder: plans.length,
      });
      return;
    }
    if (id.startsWith(PENDING_CHARACTER_PREFIX)) {
      seen.add(id);
      plans.push({
        characterId: null,
        pendingKey: id,
        pendingName: params.pendingNames?.get(id) ?? null,
        outfitId: null,
        expression,
        sortOrder: plans.length,
      });
    }
  });
  return plans;
}
