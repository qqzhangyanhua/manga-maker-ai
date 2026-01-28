/**
 * React Flow 节点数据类型定义
 */

import type { GenerationStatus } from "./types";

/**
 * 章节标题节点数据
 */
export interface ChapterHeaderNodeData {
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
 * 剧本节点数据
 */
export interface ScriptNodeData {
  scriptId: string;
  chapterId: string;
  segmentOrder: number;
  content: string;
  segmentType: "dialogue" | "action" | "narration" | "emotion";
  characterName?: string;
  status: GenerationStatus;
}

/**
 * 分镜节点数据
 */
export interface ShotNodeData {
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
 * 场景节点数据
 */
export interface SceneNodeData {
  sceneId: string;
  chapterId: string;
  sceneOrder: number;
  description: string;
  imageUrl?: string;
  status: GenerationStatus;
}

/**
 * 最终漫画节点数据
 */
export interface FinalNodeData {
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
