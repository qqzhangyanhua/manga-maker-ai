/**
 * Infinite Canvas Types
 */

export type GenerationStatus = "pending" | "generating" | "completed" | "error";

export interface CanvasTimelineConfig {
  auto_generate: boolean;
  use_character_library: boolean;
  use_scene_library: boolean;
  default_comic_style_id?: string;
}

export interface CanvasTimeline {
  id: string;
  novel_project_id: string;
  user_id: string;
  title: string;
  status: GenerationStatus;
  config: CanvasTimelineConfig;
  total_chapters: number;
  completed_chapters: number;
  total_shots: number;
  total_images: number;
  created_at: string;
  updated_at: string;
  chapters?: TimelineChapter[];
}

export interface TimelineChapter {
  id: string;
  timeline_id: string;
  chapter_id: string;
  chapter_number: number;
  script_status: GenerationStatus;
  shot_status: GenerationStatus;
  scene_status: GenerationStatus;
  final_status: GenerationStatus;
  script_segment_count: number;
  shot_count: number;
  scene_image_count: number;
  final_image_count: number;
  created_at: string;
  updated_at: string;
  script_segments?: ScriptSegment[];
}

export interface ScriptSegment {
  id: string;
  timeline_chapter_id: string;
  segment_order: number;
  content: string;
  scene_description: string;
  character_actions: string;
  dialogue?: string;
  estimated_duration: number;
  emotion_tone: string;
  source_text_start: number;
  source_text_end: number;
  created_at: string;
  shot_designs?: ShotDesign[];
}

export interface ShotDesign {
  id: string;
  script_segment_id: string;
  shot_order: number;
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  shot_description: string;
  composition_hint: string;
  character_ids: string[];
  scene_id?: string;
  expression_types: string[];
  outfit_ids: string[];
  prompt: string;
  negative_prompt?: string;
  created_at: string;
  scene_images?: SceneImage[];
  comic_panels?: ComicPanelResult[];
}

export interface SceneImage {
  id: string;
  shot_design_id: string;
  image_url: string;
  width: number;
  height: number;
  generation_prompt: string;
  scene_id?: string;
  model_used: string;
  seed?: number;
  generation_params: Record<string, unknown>;
  status: GenerationStatus;
  error_message?: string;
  created_at: string;
}

export interface ComicPanelResult {
  id: string;
  shot_design_id: string;
  scene_image_id: string;
  image_url: string;
  width: number;
  height: number;
  generation_prompt: string;
  character_reference_images: string[];
  controlnet_type: string;
  controlnet_weight: number;
  model_used: string;
  lora_models: string[];
  generation_params: Record<string, unknown>;
  status: GenerationStatus;
  error_message?: string;
  exported_to_panel_id?: string;
  created_at: string;
}
