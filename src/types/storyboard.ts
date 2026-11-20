/**
 * Storyboard 相关类型定义
 */

export type ScriptSegment = {
  id: string;
  text: string;
  start: number;
  end: number;
};

export type Panel = {
  id: string;
  panel_order: number;
  panel_type: string;
  importance: string;
  description: string;
  visual_prompt: string | null;
  dialogue: string | null;
  character_id: string | null; // FK to Character table
  character?: { id: string; name: string } | null; // Joined character data
  emotion: string | null;
  generated_image: string | null;
  prompt_used: string | null;
  segment_id?: string | null;
  script_segment_id: string | null;
  script_start: number | null;
  script_end: number | null;
  camera_angle: string | null;
  shot_size: string | null;
  sketch_image_url: string | null;
};

export type Project = {
  id: string;
  title: string;
  description: string | null;
  style: string | null;
  status: string;
  panels: Panel[];
  script: {
    id: string;
    content: string;
    segments: ScriptSegment[];
  } | null;
};

export type OperationLoadingState = {
  type: "merge" | "split" | "insert" | "prompt" | "sketch" | null;
  panelId?: string;
};
