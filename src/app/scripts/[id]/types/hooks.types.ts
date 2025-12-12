/**
 * scripts/[id] 模块 hooks 类型定义
 */

import { Panel } from "./script-editor.types";
import { CharacterReference } from "./character.types";

export interface UsePanelGenerationProps {
  projectId: string;
  onSuccess?: (panelId: string, imageUrl: string) => void;
  onError?: (panelId: string, error: string) => void;
}

export interface UsePanelDragDropProps {
  panels: Panel[];
  projectId: string;
  onPanelsReorder: (panels: Panel[]) => void;
}

export interface StoryBasicData {
  story: {
    id: string;
    title: string;
    genre: string;
    premise: string;
    status: string;
    characters: Array<{ name: string; role: string; description: string }>;
  };
  project: { id: string } | null;
}

export interface PanelsData {
  panels: Panel[];
}

export interface StoryData {
  story: Record<string, unknown>;
  project: Record<string, unknown> | null;
  panels: Panel[];
}

export interface PanelsCache {
  [storyId: string]: Panel[];
}

export interface CharacterListResponse {
  data: { characters: CharacterReference[] };
}

export interface RequestCache<T> {
  promise: Promise<T> | null;
  timestamp: number;
}

export interface GenerationTask {
  panelId: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}
