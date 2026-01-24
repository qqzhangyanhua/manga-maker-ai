/**
 * Infinite Canvas 类型定义
 */

export type GenerationStatus = "pending" | "generating" | "completed" | "error";

export interface CanvasTimelineConfig {
  auto_generate: boolean;
  use_character_library: boolean;
  use_scene_library: boolean;
  default_comic_style_id?: string;
  // 新增配置项
  ai_model?: "gpt-4" | "gpt-3.5-turbo";
  shot_density?: "sparse" | "medium" | "dense";
  visual_style?: "manga" | "realistic" | "anime";
  language?: "zh-CN" | "en-US";
}

export interface CanvasTimeline {
  id: string;
  novel_project_id: string;
  user_id: string;
  title: string;
  status: "draft" | "generating" | "completed" | "error";
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
  chapter_number: number;
  title: string;
  script_status: GenerationStatus;
  shot_status: GenerationStatus;
  final_status: GenerationStatus;
  script_segment_count: number;
  shot_count: number;
  final_image_count: number;
  character_ids: string[];
  created_at: string;
  updated_at: string;
}

/**
 * 章节轻量摘要 - 用于导航和进度展示
 */
export interface ChapterSummary {
  id: string;
  chapter_number: number;
  script_status: GenerationStatus;
  shot_status: GenerationStatus;
  final_status: GenerationStatus;
}

/**
 * 窗口状态 - 当前可视窗口信息
 */
export interface WindowState {
  center: number;
  range: number;
  start: number;
  end: number;
  total: number;
  hasMore: {
    prev: boolean;
    next: boolean;
  };
}

/**
 * 分页时间线响应
 */
export interface PaginatedTimeline extends Omit<CanvasTimeline, 'chapters'> {
  chapter_summaries: ChapterSummary[];
  chapters: TimelineChapter[];
  window: WindowState;
}
