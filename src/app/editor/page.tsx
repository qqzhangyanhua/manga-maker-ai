"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import ActionSidebar from "@/components/ImageEditor/ActionSidebar";
import CanvasWorkspace, { CanvasController, CanvasSchema } from "@/components/ImageEditor/CanvasWorkspace";
import VersionTimeline, { EditorVersion } from "@/components/ImageEditor/VersionTimeline";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ApiVersion = {
  id: string;
  label: string;
  source_type: string;
  status: string;
  image_url?: string | null;
  task_id?: string | null;
  project_id?: string | null;
  metadata?: Record<string, any> | null;
  canvas_schema?: CanvasSchema | null;
  created_at: string;
  updated_at: string;
};

const DEFAULT_PLACEHOLDER = "/assets/style-manga.jpg";

const EditorPage = () => {
  const canvasController = useRef<CanvasController | null>(null);
  const activeVersionRef = useRef<string | null>(null);
  const { toast } = useToast();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [loadingVersion, setLoadingVersion] = useState<string | null>(null);
  const [versions, setVersions] = useState<EditorVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [historyInfo, setHistoryInfo] = useState({ undo: 0, redo: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ projectId: "", taskId: "" });
  const [filterInputs, setFilterInputs] = useState(filters);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [timelineStatusFilter, setTimelineStatusFilter] = useState<"all" | "pending" | "completed" | "failed">("all");
  const [timelineSortOrder, setTimelineSortOrder] = useState<"desc" | "asc">("desc");
  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
  const canUndo = historyInfo.undo > 0;
  const canRedo = historyInfo.redo > 0;

  const normalizeVersion = useCallback((input: ApiVersion): EditorVersion => {
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
  }, []);

  const fetchVersions = useCallback(
    async (pageArg: number, pageSizeArg: number, filterArg: { projectId: string; taskId: string }) => {
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
        const mapped: EditorVersion[] = (data.versions || []).map((item: ApiVersion) => normalizeVersion(item));
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
      } catch (error: any) {
        console.error("加载版本失败:", error);
        toast({ title: "加载版本失败", description: error?.message || "请稍后再试", variant: "destructive" });
      } finally {
        setListLoading(false);
      }
    },
    [normalizeVersion, toast]
  );

  useEffect(() => {
    fetchVersions(page, pageSize, filters);
  }, [fetchVersions, page, pageSize, filters]);

  useEffect(() => {
    if (!activeVersion) return;
    if (activeVersionRef.current === activeVersion) return;
    activeVersionRef.current = activeVersion;
    const target = versions.find((version) => version.id === activeVersion);
    if (!target) return;
    canvasController.current?.setBackgroundImage(target.thumbnail);
    canvasController.current?.loadSchema(target.canvasSchema);
  }, [activeVersion, versions]);

  const currentImage = useMemo(() => {
    if (activeVersion) {
      return versions.find((v) => v.id === activeVersion)?.thumbnail ?? null;
    }
    return null;
  }, [versions, activeVersion]);

  const pollTaskStatus = useCallback(async (taskId: string, attempt = 0): Promise<{ imageUrl?: string }> => {
    if (attempt > 60) {
      throw new Error("AI 优化超时，请稍后重试");
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(2000 + attempt * 200, 5000)));
    const res = await fetch(`/api/image/task-status?task_id=${taskId}`);

    if (!res.ok) {
      throw new Error("查询任务状态失败");
    }

    const data = await res.json();

    if (data.status === "completed") {
      return data;
    }

    if (data.status === "failed") {
      throw new Error(data.error || "AI 优化失败");
    }

    return pollTaskStatus(taskId, attempt + 1);
  }, []);

  const updateVersionRecord = useCallback(
    async (id: string, payload: Record<string, any>) => {
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
    [normalizeVersion]
  );

  const createVersionRecord = useCallback(
    async (payload: {
      label: string;
      sourceType: EditorVersion["sourceType"];
      imageUrl?: string;
      status?: EditorVersion["status"];
      projectId?: string;
      metadata?: Record<string, any>;
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
    },
    [normalizeVersion]
  );

  const handleOptimize = async ({ prompt, style, strength }: { prompt: string; style: string; strength: number }) => {
    if (!currentImage) {
      toast({ title: "请先选择或上传一张图片", variant: "destructive" });
      return;
    }

    const previousActive = activeVersion;
    let pendingVersionId: string | null = null;
    let taskId: string | null = null;
    setIsOptimizing(true);

    try {
      const currentSchema = canvasController.current?.exportSchema();
      const response = await fetch("/api/image/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style,
          strength,
          imageUrl: currentImage,
          versionId: activeVersion,
          canvasSchema: currentSchema,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "AI 优化请求失败");
      }

      if (!result.version || !result.taskId) {
        throw new Error("AI 优化返回数据异常");
      }

      taskId = result.taskId;
      const versionFromApi = normalizeVersion(result.version as ApiVersion);
      pendingVersionId = versionFromApi.id;

      setVersions((prev) => [versionFromApi, ...prev]);
      setActiveVersion(versionFromApi.id);
      setLoadingVersion(versionFromApi.id);

      toast({ title: "已提交 AI 优化", description: "可继续拖拽分格，完成后自动更新" });

      const taskResult = await pollTaskStatus(taskId);
      const optimizedImage = taskResult.imageUrl || currentImage;

      const updatedVersion = await updateVersionRecord(versionFromApi.id, {
        status: "completed",
        imageUrl: optimizedImage,
      }).catch(() => null);

      setVersions((prev) =>
        prev.map((version) =>
          version.id === versionFromApi.id
            ? {
                ...version,
                status: "completed",
                thumbnail: optimizedImage,
                createdAt: new Date(),
              }
            : version
        )
      );
      if (updatedVersion) {
        setVersions((prev) =>
          prev.map((version) => (version.id === updatedVersion.id ? updatedVersion : version))
        );
      }

      setLoadingVersion(null);
      await canvasController.current?.setBackgroundImage(optimizedImage);
      toast({
        title: "AI 优化完成",
        description: `效果已更新（强度 ${strength}%）`,
      });
    } catch (error: any) {
      console.error("AI 优化失败:", error);
      if (pendingVersionId) {
        let updatedFailedVersion: EditorVersion | null = null;
        try {
          updatedFailedVersion = await updateVersionRecord(pendingVersionId, { status: "failed" });
        } catch {
          updatedFailedVersion = null;
        }
        setVersions((prev) =>
          prev.map((version) =>
            version.id === pendingVersionId
              ? updatedFailedVersion ?? { ...version, status: "failed" }
              : version
          )
        );
        setActiveVersion(previousActive);
      }
      setLoadingVersion((prev) => (prev === pendingVersionId ? null : prev));
      toast({
        title: "AI 优化失败",
        description: error?.message || "请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleTemplateSelect = (type: "single" | "two-column" | "three-grid") => {
    canvasController.current?.addPanelTemplate(type);
    setActiveTemplate(type);
  };

  const handleAddBubble = () => {
    canvasController.current?.addBubble();
  };

  const handleClear = () => {
    canvasController.current?.clearOverlays();
  };

  const handleUndo = () => {
    canvasController.current?.undo();
  };

  const handleRedo = () => {
    canvasController.current?.redo();
  };

  const handleFilterInputChange = (field: "projectId" | "taskId", value: string) => {
    setFilterInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    setFilters(filterInputs);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilterInputs({ projectId: "", taskId: "" });
    setFilters({ projectId: "", taskId: "" });
    setPage(1);
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPage((prev) => (prev < totalPages ? prev + 1 : prev));
  };

  const handlePageSizeChange = (value: string) => {
    const size = Number(value);
    if (!Number.isFinite(size) || size <= 0) return;
    setPageSize(size);
    setPage(1);
  };

  const handleRefresh = () => {
    fetchVersions(page, pageSize, filters);
  };

  const handleSaveLayout = async () => {
    if (!activeVersion) {
      toast({ title: "没有可保存的版本", description: "请选择一个版本后再试", variant: "destructive" });
      return;
    }
    const schema = canvasController.current?.exportSchema();
    setIsSavingLayout(true);
    try {
      const updated = await updateVersionRecord(activeVersion, { canvasSchema: schema ?? { objects: [] } });
      if (updated) {
        setVersions((prev) => prev.map((version) => (version.id === updated.id ? updated : version)));
      }
      toast({ title: "布局已保存", description: "版本记录已更新，可随时回溯" });
    } catch (error: any) {
      console.error("保存布局失败:", error);
      toast({ title: "保存失败", description: error?.message || "请稍后再试", variant: "destructive" });
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await canvasController.current?.setBackgroundImage(dataUrl);
      try {
        const schema = canvasController.current?.exportSchema();
        const version = await createVersionRecord({
          label: file.name || "本地上传",
          sourceType: "upload",
          imageUrl: dataUrl,
          status: "completed",
          metadata: { source: "local-upload" },
          canvasSchema: schema,
        });
        setVersions((prev) => [version, ...prev]);
        setActiveVersion(version.id);
      } catch (error: any) {
        console.error("上传版本失败:", error);
        toast({ title: "保存版本失败", description: error?.message || "请稍后再试", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlLoad = async (url: string) => {
    try {
      await canvasController.current?.setBackgroundImage(url);
      const schema = canvasController.current?.exportSchema();
      const version = await createVersionRecord({
        label: "外部图片",
        sourceType: "upload",
        imageUrl: url,
        status: "completed",
        metadata: { source: "external-url" },
        canvasSchema: schema,
      });
      setVersions((prev) => [version, ...prev]);
      setActiveVersion(version.id);
    } catch (error: any) {
      console.error("载入外部图片失败:", error);
      toast({ title: "加载失败", description: error?.message || "请检查链接或跨域设置", variant: "destructive" });
    }
  };

  const handleSelectVersion = (version: EditorVersion) => {
    setActiveVersion(version.id);
  };

  const handleExport = async () => {
    const dataUrl = await canvasController.current?.exportImage();
    if (!dataUrl) {
      toast({ title: "导出失败", description: "请先加载背景或等待画布准备", variant: "destructive" });
      return;
    }
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `comic-page-${Date.now()}.png`;
    link.click();
    toast({ title: "导出成功", description: "图片已保存到本地" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <section className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-1">Refine Center</p>
              <h1 className="text-3xl font-comic text-foreground mb-2">画面精炼工作台</h1>
              <p className="text-muted-foreground">
                对生成结果不满意？试试 AI 重新润色，或在画布上拖拽分格与对白，快速得到可发布的漫画页面。
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="comic" onClick={handleExport}>
                导出当前页面
              </Button>
              <Button variant="outline" onClick={() => canvasController.current?.clearOverlays()}>
                清空分格
              </Button>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <ActionSidebar
              isOptimizing={isOptimizing}
              onOptimize={handleOptimize}
              onTemplateSelect={handleTemplateSelect}
              onAddBubble={handleAddBubble}
              onClearOverlays={handleClear}
              onUploadFile={handleUpload}
              onLoadFromUrl={handleUrlLoad}
              onExportImage={handleExport}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              activeTemplate={activeTemplate}
            />

            <div className="flex flex-col gap-6">
              <CanvasWorkspace
                initialImage={currentImage}
                ref={canvasController as any}
                onHistoryChange={setHistoryInfo}
                onTemplateChange={setActiveTemplate}
              />
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                <div className="space-y-4">
                  <div className="border border-border rounded-xl p-4 bg-card/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">过滤与分页</p>
                      <span className="text-xs text-muted-foreground">更精确地定位版本</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input
                        placeholder="项目 ID（可选）"
                        value={filterInputs.projectId}
                        onChange={(e) => handleFilterInputChange("projectId", e.target.value)}
                      />
                      <Input
                        placeholder="任务 ID（可选）"
                        value={filterInputs.taskId}
                        onChange={(e) => handleFilterInputChange("taskId", e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={handleApplyFilters}>
                        应用筛选
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleResetFilters}>
                        重置
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={listLoading}>
                        {listLoading ? "刷新中..." : "刷新列表"}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        共 {total} 个版本
                        {listLoading && <span> · 加载中</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={handlePrevPage} disabled={page <= 1}>
                          上一页
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          第 {page} / {totalPages} 页
                        </span>
                        <Button size="sm" variant="outline" onClick={handleNextPage} disabled={page >= totalPages}>
                          下一页
                        </Button>
                        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="每页条数" />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 20, 50, 100].map((size) => (
                              <SelectItem key={size} value={String(size)}>
                                每页 {size} 条
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <VersionTimeline
                    versions={versions}
                    activeId={activeVersion}
                    loadingId={loadingVersion}
                    onSelect={handleSelectVersion}
                    statusFilter={timelineStatusFilter}
                    sortOrder={timelineSortOrder}
                    onStatusFilterChange={setTimelineStatusFilter}
                    onSortOrderChange={setTimelineSortOrder}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveLayout}
                      disabled={!activeVersion || isSavingLayout}
                    >
                      {isSavingLayout ? "保存中..." : "保存当前布局"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={listLoading}>
                      手动刷新
                    </Button>
                  </div>
                </div>

                <div className="border border-dashed border-primary/40 rounded-xl p-4 bg-primary/5 text-sm text-muted-foreground space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-4 h-4" />
                    后续待接入功能
                  </div>
                  <Separator />
                  <ul className="list-disc list-inside space-y-1">
                    <li>与生成队列打通，直接载入最新任务</li>
                    <li>保存分格 JSON，支持多人协作</li>
                    <li>自定义气泡样式与字体库</li>
                  </ul>
                  {listLoading && <p className="text-xs text-muted-foreground">版本加载中...</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditorPage;
