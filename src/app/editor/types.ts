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
  label?: string;
  sourceType?: "original" | "optimize" | "layout" | "upload";
  source_type?: "original" | "optimize" | "layout" | "upload";
  status: string;
  imageUrl?: string | null;
  image_url?: string | null;
  canvasSchema?: Record<string, unknown> | null;
  canvas_schema?: Record<string, unknown> | null;
  prompt?: string | null;
  taskId?: string | null;
  task_id?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export function normalizeVersion(apiVersion: ApiVersion): EditorVersion {
  // Map API status to EditorVersion status
  let status: "pending" | "completed" | "failed" = "pending";
  if (apiVersion.status === "completed") {
    status = "completed";
  } else if (apiVersion.status === "failed") {
    status = "failed";
  }

  const sourceType = apiVersion.sourceType ?? apiVersion.source_type ?? "optimize";
  const imageUrl = apiVersion.imageUrl ?? apiVersion.image_url ?? "/placeholder.svg";
  const createdAtRaw = apiVersion.createdAt ?? apiVersion.created_at;
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : new Date();

  return {
    id: apiVersion.id,
    label: apiVersion.label || apiVersion.prompt || "版本",
    sourceType,
    status,
    thumbnail: imageUrl,
    taskId: apiVersion.taskId ?? apiVersion.task_id ?? null,
    canvasSchema: (apiVersion.canvasSchema ?? apiVersion.canvas_schema ?? null) as CanvasSchema | null,
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
  };
}
