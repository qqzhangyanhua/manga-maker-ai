/**
 * Detail Panel 业务数据类型定义
 */

import type { ShotDesign } from "@prisma/client";
import type { ShotImageCharacterInput } from "./shared-types";

/**
 * 分镜详情 API 响应（单个）
 */
export interface ShotDetailResponse {
  shot: ShotDesign;
  metadata?: {
    chapter_title?: string;
    chapter_number?: number;
  };
}

/**
 * 分镜详情列表 API 响应
 */
export interface ShotDetailListResponse {
  chapterId: string;
  chapterNumber: number;
  timelineId: string;
  novelProjectId?: string | null;
  shots: ShotDesign[];
  totalCount: number;
}

/**
 * 分镜图片生成载荷
 */
export interface GenerateShotImagePayload {
  shot_id: string;
  characters: ShotImageCharacterInput[];
  comic_style_id?: string;
  regenerate?: boolean;
}

/**
 * 分镜图片生成载荷（组件内部使用）
 */
export interface GenerateShotImagePayloadLocal {
  shotId: string;
  characters: Array<{
    name: string;
    role: string;
    description: string;
    reference_image_url?: string;
  }>;
  comicStyleId?: string;
}

/**
 * 场景图片
 */
export interface SceneImage {
  id: string;
  scene_order: number;
  description: string;
  generated_image_url: string | null;
  status: "pending" | "generating" | "completed" | "error";
  created_at: string;
}

/**
 * 场景详情 API 响应（单个）
 */
export interface SceneDetailResponse {
  scene: SceneImage;
  metadata?: {
    chapter_title?: string;
    chapter_number?: number;
  };
}

/**
 * 场景详情列表 API 响应
 */
export interface SceneDetailListResponse {
  chapterId: string;
  chapterNumber: number;
  scenes: Array<{
    id: string;
    image_url: string;
    prompt: string;
    created_at: string;
  }>;
  totalCount: number;
}

/**
 * 剧本分段
 */
export interface ScriptSegment {
  id: string;
  segment_order: number;
  content: string;
  segment_type: "dialogue" | "action" | "narration" | "emotion";
  character_name?: string;
  created_at: string;
}

/**
 * 剧本详情 API 响应（单个）
 */
export interface ScriptDetailResponse {
  script: ScriptSegment;
  metadata?: {
    chapter_title?: string;
    chapter_number?: number;
  };
}

/**
 * 剧本详情列表 API 响应
 */
export interface ScriptDetailListResponse {
  chapterId: string;
  chapterNumber: number;
  segments: Array<{
    id: string;
    segment_order: number;
    content: string;
    scene_description: string;
    character_actions: string;
    dialogue: string | null;
    emotion_tone: string;
    estimated_duration: number;
    created_at: string;
  }>;
  totalCount: number;
}

/**
 * 漫画面板
 */
export interface ComicPanel {
  id: string;
  panel_order: number;
  description: string;
  generated_image_url: string | null;
  speech_bubbles?: Array<{
    text: string;
    position: { x: number; y: number };
  }>;
  status: "pending" | "generating" | "completed" | "error";
  created_at: string;
}

/**
 * 最终漫画详情 API 响应（单个）
 */
export interface FinalDetailResponse {
  panel: ComicPanel;
  metadata?: {
    chapter_title?: string;
    chapter_number?: number;
  };
}

/**
 * 最终漫画详情列表 API 响应
 */
export interface FinalDetailListResponse {
  chapterId: string;
  chapterNumber: number;
  panels: Array<{
    id: string;
    image_url: string;
    panel_order: number;
    created_at: string;
  }>;
  totalCount: number;
}
