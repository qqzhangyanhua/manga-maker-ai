"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/Landing";
import ActionSidebar from "@/components/ImageEditor/ActionSidebar";
import CanvasWorkspace, { CanvasController } from "@/components/ImageEditor/CanvasWorkspace";
import VersionTimeline, { EditorVersion } from "@/components/ImageEditor/VersionTimeline";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";
import { useVersionManager } from "./hooks/useVersionManager";
import { useImageOptimizer } from "./hooks/useImageOptimizer";
import { usePagination } from "./hooks/usePagination";
import { FilterBar } from "./components/FilterBar";

const EditorPage = () => {
  const canvasController = useRef<CanvasController | null>(null);
  const activeVersionRef = useRef<string | null>(null);
  const { toast } = useToast();

  const [loadingVersion, setLoadingVersion] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [historyInfo, setHistoryInfo] = useState({ undo: 0, redo: 0 });
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [timelineStatusFilter, setTimelineStatusFilter] = useState<
    "all" | "pending" | "completed" | "failed"
  >("all");
  const [timelineSortOrder, setTimelineSortOrder] = useState<"desc" | "asc">("desc");

  const canUndo = historyInfo.undo > 0;
  const canRedo = historyInfo.redo > 0;

  const {
    versions,
    setVersions,
    activeVersion,
    setActiveVersion,
    listLoading,
    fetchVersions,
    updateVersionRecord,
    createVersionRecord,
  } = useVersionManager();

  const {
    page,
    pageSize,
    total,
    totalPages,
    filterInputs,
    handleFilterInputChange,
    handleApplyFilters,
    handleResetFilters,
    handlePrevPage,
    handleNextPage,
    handlePageSizeChange,
    handleRefresh: refreshPagination,
  } = usePagination(1, 20, fetchVersions);

  useEffect(() => {
    fetchVersions(page, pageSize, { projectId: "", taskId: "" });
  }, [fetchVersions, page, pageSize]);

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

  const { isOptimizing, handleOptimize } = useImageOptimizer({
    currentImage,
    activeVersion,
    canvasController,
    onVersionsUpdate: setVersions,
    onActiveVersionChange: setActiveVersion,
    onLoadingVersionChange: setLoadingVersion,
    updateVersionRecord,
  });

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

  const handleRefresh = () => {
    fetchVersions(page, pageSize, { projectId: "", taskId: "" });
  };

  const handleSaveLayout = async () => {
    if (!activeVersion) {
      toast({ title: "没有可保存的版本", description: "请选择一个版本后再试", variant: "destructive" });
      return;
    }
    const schema = canvasController.current?.exportSchema();
    setIsSavingLayout(true);
    try {
      const updated = await updateVersionRecord(activeVersion, {
        canvasSchema: schema ?? { objects: [] },
      });
      if (updated) {
        setVersions((prev) => prev.map((version) => (version.id === updated.id ? updated : version)));
      }
      toast({ title: "布局已保存", description: "版本记录已更新，可随时回溯" });
    } catch (error: unknown) {
      console.error("保存布局失败:", error);
      const message = error instanceof Error ? error.message : "请稍后再试";
      toast({ title: "保存失败", description: message, variant: "destructive" });
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
      } catch (error: unknown) {
        console.error("上传版本失败:", error);
        const message = error instanceof Error ? error.message : "请稍后再试";
        toast({ title: "保存版本失败", description: message, variant: "destructive" });
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
    } catch (error: unknown) {
      console.error("载入外部图片失败:", error);
      const message = error instanceof Error ? error.message : "请检查链接或跨域设置";
      toast({ title: "加载失败", description: message, variant: "destructive" });
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
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <section className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] mb-1">
                Refine Center
              </p>
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
                ref={canvasController as React.RefObject<CanvasController>}
                onHistoryChange={setHistoryInfo}
                onTemplateChange={setActiveTemplate}
              />
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                <div className="space-y-4">
                  <FilterBar
                    projectId={filterInputs.projectId}
                    taskId={filterInputs.taskId}
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    pageSize={pageSize}
                    listLoading={listLoading}
                    onProjectIdChange={(value) => handleFilterInputChange("projectId", value)}
                    onTaskIdChange={(value) => handleFilterInputChange("taskId", value)}
                    onApply={handleApplyFilters}
                    onReset={handleResetFilters}
                    onRefresh={refreshPagination}
                    onPrevPage={handlePrevPage}
                    onNextPage={handleNextPage}
                    onPageSizeChange={handlePageSizeChange}
                  />

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
