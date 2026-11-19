/**
 * 画布镜头（CanvasShot）：画布界面里的"镜头"就是项目分镜（Panel）。
 * 字段沿用画布原来的命名，id 是分镜 ID，script_segment_id 是剧本片段 ID。
 */
export interface CanvasShot {
  id: string;
  script_segment_id: string;
  /** 在剧本片段内的顺序，从 1 开始，按分镜编号计算 */
  shot_order: number;
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  shot_description: string;
  composition_hint: string;
  location_key: string;
  /** 角色库角色 ID，或待绑定小说角色的临时 ID（unbound-xxx）；与 outfit_ids、expression_types 一一对应 */
  character_ids: string[];
  outfit_ids: string[];
  expression_types: string[];
  scene_id: string | null;
  prompt: string;
  negative_prompt: string | null;
  generated_image_url: string | null;
  generation_status: string;
  character_prompt_template_ids: string[];
  prompt_composition_id: string | null;
  nine_grid_generation_id: string | null;
  character_prompt_status: string;
  final_prompt_status: string;
  nine_grid_status: string;
  selection_status: string;
  created_at: Date;
}

export interface CanvasShotPipelineFields {
  character_prompt_template_ids?: string[];
  prompt_composition_id?: string | null;
  nine_grid_generation_id?: string | null;
  character_prompt_status?: string;
  final_prompt_status?: string;
  nine_grid_status?: string;
  selection_status?: string;
}

export interface CanvasShotCharacters {
  character_ids: string[];
  outfit_ids?: string[];
  expression_types?: string[];
  /** 待绑定角色的名称，按临时 ID 查 */
  pendingNames?: Map<string, string>;
}

export interface CanvasShotInput {
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  shot_description: string;
  composition_hint: string;
  location_key: string;
  prompt: string;
  negative_prompt: string | null;
  character_ids: string[];
}

export interface CanvasShotPatch extends CanvasShotPipelineFields {
  camera_angle?: string;
  shot_size?: string;
  panel_type?: string;
  shot_description?: string;
  composition_hint?: string;
  location_key?: string;
  scene_id?: string | null;
  prompt?: string;
  negative_prompt?: string | null;
  generated_image_url?: string | null;
  generation_status?: string;
  character_ids?: string[];
  outfit_ids?: string[];
  expression_types?: string[];
}

/** 接口返回给前端的画布镜头（日期序列化为字符串） */
export type CanvasShotJson = Omit<CanvasShot, "created_at"> & { created_at: string };

/** 画布最终漫画（canvas_final 候选图） */
export interface CanvasFinal {
  id: string;
  panel_id: string;
  image_url: string;
  prompt: string;
  width: number;
  height: number;
  is_selected: boolean;
  status: "completed";
  created_at: Date;
}

/** 接口返回给前端的画布最终漫画 */
export type CanvasFinalJson = Omit<CanvasFinal, "created_at"> & { created_at: string };

/** 分镜角色行的写入计划 */
export interface PanelCharacterPlan {
  characterId: string | null;
  pendingKey: string | null;
  pendingName: string | null;
  outfitId: string | null;
  expression: string | null;
  sortOrder: number;
}
