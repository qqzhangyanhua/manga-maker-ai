/**
 * 编辑器相关类型定义
 */

import { EditorVersion } from "@/components/ImageEditor/VersionTimeline";
import { CanvasController, CanvasSchema } from "@/components/ImageEditor/CanvasWorkspace";

export type UseImageOptimizerOptions = {
  currentImage: string | null;
  activeVersion: string | null;
  canvasController: React.MutableRefObject<CanvasController | null>;
  onVersionsUpdate: (updater: (prev: EditorVersion[]) => EditorVersion[]) => void;
  onActiveVersionChange: (id: string) => void;
  onLoadingVersionChange: (id: string | null) => void;
  updateVersionRecord: (id: string, payload: Record<string, unknown>) => Promise<EditorVersion>;
};

export type FilterBarProps = {
  projectId: string;
  taskId: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  listLoading: boolean;
  onProjectIdChange: (value: string) => void;
  onTaskIdChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (value: string) => void;
};

export type VersionFilters = {
  projectId: string;
  taskId: string;
};

export interface ApiVersion {
  id: string;
  pageId: string;
  status: string;
  imageUrl: string;
  canvasSchema: Record<string, unknown> | null;
  prompt: string | null;
  strength: number | null;
  createdAt: string;
  updatedAt: string;
}

export function normalizeVersion(apiVersion: ApiVersion): EditorVersion {
  // Map API status to EditorVersion status
  let status: "pending" | "completed" | "failed" = "pending";
  if (apiVersion.status === "completed") {
    status = "completed";
  } else if (apiVersion.status === "failed") {
    status = "failed";
  }

  return {
    id: apiVersion.id,
    label: apiVersion.prompt || "版本",
    sourceType: "optimize",
    status,
    thumbnail: apiVersion.imageUrl,
    canvasSchema: apiVersion.canvasSchema as CanvasSchema | null,
    createdAt: new Date(apiVersion.createdAt),
  };
}
