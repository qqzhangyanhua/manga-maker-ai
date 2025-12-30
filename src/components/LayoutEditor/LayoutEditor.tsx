"use client";

/**
 * 排版编辑器主组件
 * 集成页面管理器、Canvas 编辑器、工具栏
 */

import { useEffect, useCallback, useState } from "react";
import * as fabric from "fabric";
import { Loader2 } from "lucide-react";
import { PageManager } from "./PageManager";
import { MangaCanvas, CanvasToolbar } from "./Canvas";
import { ExportDialog, type ExportOptions } from "./Export";
import { PropertyPanel } from "./Properties";
import { useLayoutEditorStore } from "@/stores/layout-editor-store";
import { usePageManager } from "@/hooks/layout/usePageManager";
import { useCanvasHistory } from "@/hooks/layout/useCanvasHistory";
import { useCanvasObjects, getCanvasJSON } from "@/hooks/layout/useCanvasObjects";
import { useToast } from "@/hooks/use-toast";
import { exportCanvasPages, type CanvasPage } from "@/lib/layout/canvas-export";
import { renderMultiplePages, generateThumbnailFromCanvas } from "@/lib/layout/canvas-renderer";
import type { ComicPageData } from "@/types/layout";

interface LayoutEditorProps {
  projectId: string;
  initialPages?: ComicPageData[];
}

export function LayoutEditor({ projectId, initialPages }: LayoutEditorProps) {
  const { toast } = useToast();
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null);

  const {
    pages,
    currentPageId,
    isLoading,
    setPages,
    setCurrentPage,
    setLoading,
    updatePage,
  } = useLayoutEditorStore();

  const {
    isLoading: isApiLoading,
    updatePage: updatePageApi,
    applyTemplate,
  } = usePageManager(projectId);

  // 撤销/重做功能
  const {
    canUndo,
    canRedo,
    undo,
    redo,
  } = useCanvasHistory(canvas);

  // 画布对象创建
  const { addBubble, addEffect } = useCanvasObjects({
    canvas,
    onModified: () => setHasUnsavedChanges(true),
  });

  // 获取当前页面
  const currentPage = pages.find((p) => p.id === currentPageId);

  // 初始化页面数据
  useEffect(() => {
    if (initialPages && initialPages.length > 0) {
      setPages(initialPages);
      setCurrentPage(initialPages[0].id);
    }
  }, [initialPages, setPages, setCurrentPage]);

  // Canvas 准备就绪
  const handleCanvasReady = useCallback((fabricCanvas: fabric.Canvas) => {
    setCanvas(fabricCanvas);
  }, []);

  // 选择变化
  const handleSelectionChange = useCallback((_selectedId: string | null) => {
    if (!canvas) {
      setSelectedObject(null);
      return;
    }
    const activeObject = canvas.getActiveObject();
    setSelectedObject(activeObject || null);
  }, [canvas]);

  // Canvas 修改
  const handleCanvasModified = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // 应用模板到当前页面
  const handleTemplateSelect = useCallback(
    async (templateId: string) => {
      if (!currentPageId) {
        toast({
          title: "请先选择页面",
          variant: "destructive",
        });
        return;
      }

      try {
        setLoading(true);
        const { page } = await applyTemplate(currentPageId, {
          templateId,
          panelMapping: {},
        });

        // 更新本地状态
        updatePage(currentPageId, page);
        setHasUnsavedChanges(false);

        toast({ title: "模板应用成功" });

        // 如果 Canvas 已初始化，重新加载数据
        if (canvas && page.canvasData) {
          canvas.clear();
          canvas.backgroundColor = "#ffffff";
          canvas.renderAll();
        }
      } catch (error) {
        toast({
          title: "模板应用失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [currentPageId, applyTemplate, updatePage, setLoading, toast, canvas]
  );

  // 导出页面
  const handleExport = useCallback(
    async (options: ExportOptions) => {
      if (!canvas) {
        throw new Error("Canvas 未初始化");
      }

      // 准备要导出的页面
      let pagesToExport: CanvasPage[] = [];

      if (options.pageRange === "current" && currentPage) {
        // 只导出当前页面
        const dataUrl = canvas.toDataURL({
          format: "png",
          quality: 1,
          multiplier: 1,
        });
        pagesToExport.push({
          id: currentPage.id,
          pageOrder: currentPage.pageOrder,
          width: currentPage.width,
          height: currentPage.height,
          dataUrl,
        });
      } else {
        // 批量导出所有页面
        // 首先保存当前页面的状态
        const currentCanvasData = getCanvasJSON(canvas);

        // 更新当前页面的 canvasData 到 pages 数组
        const pagesWithCurrentData = pages.map((p) => {
          if (p.id === currentPageId) {
            return { ...p, canvasData: currentCanvasData };
          }
          return p;
        });

        // 按页面顺序排序
        const sortedPages = [...pagesWithCurrentData].sort((a, b) => a.pageOrder - b.pageOrder);

        // 渲染所有页面
        toast({ title: `正在渲染 ${sortedPages.length} 个页面...` });

        const renderedPages = await renderMultiplePages(
          sortedPages.map((p) => ({
            id: p.id,
            pageOrder: p.pageOrder,
            width: p.width,
            height: p.height,
            canvasData: p.canvasData as object | undefined,
          })),
          {
            multiplier: 1,
            onProgress: (current, total) => {
              console.log(`Rendering page ${current}/${total}`);
            },
          }
        );

        pagesToExport = renderedPages;
      }

      if (pagesToExport.length === 0) {
        throw new Error("没有可导出的页面");
      }

      await exportCanvasPages(pagesToExport, {
        format: options.format,
        quality: options.quality,
        dpi: options.dpi,
      });
    },
    [canvas, currentPage, currentPageId, pages, toast]
  );

  // 保存当前页面
  const saveCurrentPage = useCallback(async () => {
    if (!canvas || !currentPageId) return;

    try {
      setLoading(true);

      // 导出 Canvas 数据
      const canvasData = getCanvasJSON(canvas);

      // 生成缩略图
      const thumbnailUrl = generateThumbnailFromCanvas(canvas, {
        maxWidth: 120,
        maxHeight: 160,
      });

      // 更新到服务器
      await updatePageApi(currentPageId, {
        canvasData,
        thumbnailUrl,
      });

      // 更新本地状态
      updatePage(currentPageId, {
        canvasData,
        thumbnailUrl,
        updatedAt: new Date().toISOString(),
      });

      setHasUnsavedChanges(false);
      toast({ title: "保存成功" });
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [canvas, currentPageId, updatePageApi, updatePage, setLoading, toast]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        saveCurrentPage();
      }

      // Ctrl+Z 撤销
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y 或 Ctrl+Shift+Z 重做
      if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "z")) {
        e.preventDefault();
        redo();
      }

      // Delete 删除选中对象
      if (e.key === "Delete" && canvas) {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          canvas.remove(activeObject);
          canvas.renderAll();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canvas, saveCurrentPage, undo, redo]);

  // 离开页面前警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // 加载中状态
  if (isLoading && pages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <CanvasToolbar
        onTemplateSelect={handleTemplateSelect}
        selectedTemplateId={currentPage?.templateId}
        onBubbleSelect={addBubble}
        onEffectSelect={addEffect}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        disabled={isApiLoading || !currentPageId}
      />

      {/* 主编辑区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：页面管理器 */}
        <PageManager projectId={projectId} />

        {/* 中间：Canvas 编辑器 */}
        <MangaCanvas
          className="flex-1"
          onCanvasReady={handleCanvasReady}
          onSelectionChange={handleSelectionChange}
          onCanvasModified={handleCanvasModified}
        />

        {/* 右侧：属性面板 */}
        <div className="w-64 border-l bg-background flex flex-col">
          <div className="p-4 border-b">
            <div className="text-sm font-medium">属性</div>
          </div>

          {/* 属性编辑区 */}
          <div className="flex-1 overflow-auto">
            <PropertyPanel
              canvas={canvas}
              selectedObject={selectedObject}
              onPropertyChange={() => setHasUnsavedChanges(true)}
            />
          </div>

          {/* 底部操作区 */}
          <div className="p-4 border-t space-y-3">
            {/* 保存按钮 */}
            <button
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              onClick={saveCurrentPage}
              disabled={isApiLoading || !hasUnsavedChanges}
            >
              {isApiLoading ? "保存中..." : hasUnsavedChanges ? "保存更改" : "已保存"}
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Ctrl+S 快速保存
            </p>

            {/* 导出按钮 */}
            <div className="pt-3 border-t">
              <ExportDialog
                onExport={handleExport}
                pageCount={pages.length}
                disabled={!canvas || pages.length === 0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
