/**
 * 画布上的一格分镜。id 是分镜 ID，segment_id 是剧本片段 ID。
 * 出场角色按顺序排列，角色库 id 不在这条 interface 上。
 */
export interface PanelCastMember {
  project_character_id: string | null;
  outfit_id: string | null;
  expression: string | null;
  pending_character_key: string | null;
  pending_character_name: string | null;
}

/** 画布写入的一格出场角色。只接受项目角色，不接受待绑定。 */
export interface PanelCastWrite {
  project_character_id: string;
  outfit_id?: string | null;
  expression?: string | null;
}

export interface CanvasShot {
  id: string;
  segment_id: string;
  /** 这一章里的分镜编号 */
  panel_order: number;
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  description: string;
  composition_hint: string;
  location_key: string;
  characters: PanelCastMember[];
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
  description?: string;
  composition_hint?: string;
  location_key?: string;
  scene_id?: string | null;
  prompt?: string;
  negative_prompt?: string | null;
  generated_image_url?: string | null;
  generation_status?: string;
  /** 传了就整体替换出场角色。空数组清空出场角色和主角色。 */
  characters?: PanelCastWrite[];
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
