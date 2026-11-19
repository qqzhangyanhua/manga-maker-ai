/**
 * Detail Panel 业务数据类型定义
 */

import type { CanvasFinalJson, CanvasShotJson } from "@/lib/canvas/types";
import type { ShotImageCharacterInput } from "./shared-types";

/**
 * P2-3: 有效的情感基调类型
 */
export type EmotionTone = 
  | "紧张"
  | "温馨"
  | "激烈"
  | "悲伤"
  | "幽默"
  | "平静"
  | "神秘"
  | "浪漫"
  | "恐怖"
  | "欢快";

/**
 * P2-3: 情感基调配置（用于 UI 展示）
 */
export const EMOTION_TONE_CONFIG: Record<EmotionTone, { label: string; color: string; bgColor: string }> = {
  "紧张": { label: "紧张", color: "text-orange-400", bgColor: "bg-orange-900/30" },
  "温馨": { label: "温馨", color: "text-pink-400", bgColor: "bg-pink-900/30" },
  "激烈": { label: "激烈", color: "text-red-400", bgColor: "bg-red-900/30" },
  "悲伤": { label: "悲伤", color: "text-blue-400", bgColor: "bg-blue-900/30" },
  "幽默": { label: "幽默", color: "text-yellow-400", bgColor: "bg-yellow-900/30" },
  "平静": { label: "平静", color: "text-green-400", bgColor: "bg-green-900/30" },
  "神秘": { label: "神秘", color: "text-purple-400", bgColor: "bg-purple-900/30" },
  "浪漫": { label: "浪漫", color: "text-rose-400", bgColor: "bg-rose-900/30" },
  "恐怖": { label: "恐怖", color: "text-gray-400", bgColor: "bg-gray-900/30" },
  "欢快": { label: "欢快", color: "text-amber-400", bgColor: "bg-amber-900/30" },
};

/**
 * P2-3: 检查是否为有效的情感基调
 */
export function isValidEmotionTone(tone: string): tone is EmotionTone {
  return tone in EMOTION_TONE_CONFIG;
}

/**
 * P2-3: 获取情感基调配置（带 fallback）
 */
export function getEmotionToneConfig(tone: string) {
  if (isValidEmotionTone(tone)) {
    return EMOTION_TONE_CONFIG[tone];
  }
  return EMOTION_TONE_CONFIG["平静"]; // 默认返回平静
}

/**
 * 分镜详情 API 响应（单个）
 */
export interface ShotDetailResponse {
  shot: CanvasShotJson;
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
  projectId: string;
  status: string;
  /** 按剧本片段、分镜编号排好序 */
  shots: CanvasShotJson[];
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
  status: string;
  panels: CanvasFinalJson[];
  totalCount: number;
}
