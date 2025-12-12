import { CanvasSchema } from "@/components/ImageEditor/CanvasWorkspace";
import { EditorVersion } from "@/components/ImageEditor/VersionTimeline";

export type ApiVersion = {
  id: string;
  label: string;
  source_type: string;
  status: string;
  image_url?: string | null;
  task_id?: string | null;
  project_id?: string | null;
  metadata?: Record<string, unknown> | null;
  canvas_schema?: CanvasSchema | null;
  created_at: string;
  updated_at: string;
};

export type VersionFilters = {
  projectId: string;
  taskId: string;
};

export const DEFAULT_PLACEHOLDER = "/assets/style-manga.jpg";

export const normalizeVersion = (input: ApiVersion): EditorVersion => {
  const sourceType = ["original", "optimize", "layout", "upload"].includes(input.source_type)
    ? (input.source_type as EditorVersion["sourceType"])
    : "upload";
  const status = ["pending", "completed", "failed"].includes(input.status)
    ? (input.status as EditorVersion["status"])
    : "pending";
  return {
    id: input.id,
    label: input.label,
    sourceType,
    status,
    thumbnail: input.image_url || DEFAULT_PLACEHOLDER,
    createdAt: new Date(input.created_at ?? Date.now()),
    taskId: input.task_id,
    canvasSchema: input.canvas_schema ?? null,
  };
};
