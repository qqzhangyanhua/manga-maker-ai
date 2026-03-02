import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { EditorVersion } from "@/components/ImageEditor/VersionTimeline";
import { CanvasSchema } from "@/components/ImageEditor/CanvasWorkspace";
import { ApiVersion, VersionFilters, normalizeVersion } from "../types";

interface UseVersionManagerOptions {
  initialVersions?: EditorVersion[];
  initialActiveVersion?: string | null;
  initialTotal?: number;
  initialPage?: number;
  initialPageSize?: number;
  initialFilters?: VersionFilters;
}

interface VersionListMeta {
  total: number;
  page: number;
  pageSize: number;
}

export const useVersionManager = (options: UseVersionManagerOptions = {}) => {
  const [versions, setVersions] = useState<EditorVersion[]>(options.initialVersions ?? []);
  const [activeVersion, setActiveVersion] = useState<string | null>(
    options.initialActiveVersion ?? options.initialVersions?.[0]?.id ?? null
  );
  const [listLoading, setListLoading] = useState(false);
  const [page, setPage] = useState(options.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(options.initialPageSize ?? 20);
  const [total, setTotal] = useState(options.initialTotal ?? 0);
  const [filters, setFilters] = useState<VersionFilters>(
    options.initialFilters ?? { projectId: "", taskId: "" }
  );
  const { toast } = useToast();

  const fetchVersions = useCallback(
    async (pageArg: number, pageSizeArg: number, filterArg: VersionFilters) => {
      setListLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(pageArg));
        params.set("page_size", String(pageSizeArg));
        params.set("include_schema", "true");
        if (filterArg.projectId) params.set("project_id", filterArg.projectId);
        if (filterArg.taskId) params.set("task_id", filterArg.taskId);

        const res = await fetch(`/api/image/page?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "获取版本列表失败");
        }
        const mapped: EditorVersion[] = (data.versions || []).map((item: ApiVersion) =>
          normalizeVersion(item)
        );
        setVersions(mapped);
        setTotal(data.total ?? 0);
        setPage(pageArg);
        setPageSize(data.pageSize ?? pageSizeArg);

        if (mapped.length > 0) {
          setActiveVersion((prev) => {
            if (prev && mapped.some((v) => v.id === prev)) {
              return prev;
            }
            return mapped[0].id;
          });
        } else {
          setActiveVersion(null);
        }

        return {
          total: data.total ?? 0,
          page: data.page ?? pageArg,
          pageSize: data.pageSize ?? pageSizeArg,
        } as VersionListMeta;
      } catch (error: unknown) {
        console.error("加载版本失败:", error);
        const message = error instanceof Error ? error.message : "请稍后再试";
        toast({ title: "加载版本失败", description: message, variant: "destructive" });
        return null;
      } finally {
        setListLoading(false);
      }
    },
    [toast]
  );

  const updateVersionRecord = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      const res = await fetch(`/api/image/page/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "更新版本失败");
      }
      return normalizeVersion(data.version);
    },
    []
  );

  const createVersionRecord = useCallback(async (payload: {
    label: string;
    sourceType: EditorVersion["sourceType"];
    imageUrl?: string;
    status?: EditorVersion["status"];
    projectId?: string;
    metadata?: Record<string, unknown>;
    taskId?: string;
    canvasSchema?: CanvasSchema | null;
  }) => {
    const res = await fetch("/api/image/page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: payload.label,
        sourceType: payload.sourceType,
        imageUrl: payload.imageUrl,
        status: payload.status ?? "completed",
        projectId: payload.projectId,
        metadata: payload.metadata,
        taskId: payload.taskId,
        canvasSchema: payload.canvasSchema ?? null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "创建版本失败");
    }
    return normalizeVersion(data.version);
  }, []);

  return {
    versions,
    setVersions,
    activeVersion,
    setActiveVersion,
    listLoading,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    filters,
    setFilters,
    fetchVersions,
    updateVersionRecord,
    createVersionRecord,
  };
};
