/**
 * React Flow 节点数据类型定义
 */

import type { GenerationStatus } from "./types";

/**
 * 章节标题节点数据（章节级别）
 */
export interface ChapterHeaderNodeData {
  chapterId: string;
  chapterNumber: number;
  progress: number;
  timelineId: string;
  characterCount?: number;
}

/**
 * 章节标题节点数据（完整版，包含所有状态）
 */
export interface ChapterHeaderNodeDataFull {
  chapterId: string;
  chapterNumber: number;
  title: string;
  scriptStatus: GenerationStatus;
  shotStatus: GenerationStatus;
  sceneStatus: GenerationStatus;
  finalStatus: GenerationStatus;
  scriptCount: number;
  shotCount: number;
  sceneCount: number;
  finalCount: number;
}

/**
 * 剧本节点数据（章节级别）
 */
export interface ScriptNodeData {
  chapterId: string;
  status: GenerationStatus;
  count: number;
  timelineId: string;
}

/**
 * 剧本节点数据（单个分段）
 */
export interface ScriptSegmentNodeData {
  scriptId: string;
  chapterId: string;
  segmentOrder: number;
  content: string;
  segmentType: "dialogue" | "action" | "narration" | "emotion";
  characterName?: string;
  status: GenerationStatus;
}

/**
 * 分镜节点数据（章节级别）
 */
export interface ShotNodeData {
  chapterId: string;
  status: GenerationStatus;
  count: number;
  canGenerate: boolean;
  timelineId: string;
}

/**
 * 分镜节点数据（单个分镜）
 */
export interface ShotItemNodeData {
  shotId: string;
  chapterId: string;
  shotOrder: number;
  description: string;
  imageUrl?: string;
  status: GenerationStatus;
  prompt?: string;
  characterBindings?: number;
  nineGridStatus?: "pending" | "completed";
  selectionStatus?: "pending" | "selected" | "refined";
}

/**
 * 场景节点数据（章节级别）
 */
export interface SceneNodeData {
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  status: GenerationStatus;
  count: number;
  canGenerate: boolean;
  timelineId: string;
}

/**
 * 场景节点数据（单个场景）
 */
export interface SceneItemNodeData {
  sceneId: string;
  chapterId: string;
  sceneOrder: number;
  description: string;
  imageUrl?: string;
  status: GenerationStatus;
}

/**
 * 最终漫画节点数据（章节级别）
 */
export interface FinalNodeData {
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  status: GenerationStatus;
  count: number;
  canGenerate: boolean;
  timelineId: string;
}

/**
 * 最终漫画节点数据（单个面板）
 */
export interface FinalItemNodeData {
  finalId: string;
  chapterId: string;
  panelOrder: number;
  description: string;
  imageUrl?: string;
  status: GenerationStatus;
  speechBubbles?: Array<{
    text: string;
    position: { x: number; y: number };
  }>;
}
