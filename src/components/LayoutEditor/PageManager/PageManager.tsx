"use client";

/**
 * 页面管理器组件
 * 左侧边栏，显示页面列表，支持拖拽排序
 */

import { useState, useCallback } from "react";
import { Plus, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLayoutEditorStore } from "@/stores/layout-editor-store";
import { usePageManager } from "@/hooks/layout/usePageManager";
import { PageThumbnail } from "./PageThumbnail";
import { PAGE_PRESETS, type PagePreset } from "@/types/layout";
import { useToast } from "@/hooks/use-toast";

interface PageManagerProps {
  projectId: string;
}

export function PageManager({ projectId }: PageManagerProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("mobile_vertical");

  const {
    pages,
    currentPageId,
    setCurrentPage,
    addPage,
    deletePage: deletePageFromStore,
    reorderPages: reorderPagesInStore,
  } = useLayoutEditorStore();

  const {
    isLoading,
    createPage,
    deletePage: deletePageApi,
    duplicatePage: duplicatePageApi,
    reorderPages: reorderPagesApi,
  } = usePageManager(projectId);

  // 创建新页面
  const handleCreatePage = useCallback(async () => {
    const preset = PAGE_PRESETS.find((p) => p.id === selectedPreset);
    if (!preset) return;

    try {
      const newPage = await createPage({
        presetName: preset.id,
        pageSize: {
          width: preset.width,
          height: preset.height,
          dpi: preset.dpi,
        },
      });

      addPage({
        id: newPage.id,
        projectId,
        pageOrder: newPage.pageOrder ?? pages.length,
        width: newPage.width,
        height: newPage.height,
        dpi: newPage.dpi,
        presetName: newPage.presetName,
        thumbnailUrl: newPage.thumbnailUrl,
        createdAt: newPage.createdAt,
        updatedAt: newPage.updatedAt,
      });

      setIsAddDialogOpen(false);
      toast({ title: "页面已创建" });
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  }, [selectedPreset, createPage, addPage, pages.length, projectId, toast]);

  // 删除页面
  const handleDeletePage = useCallback(
    async (pageId: string) => {
      if (pages.length <= 1) {
        toast({
          title: "无法删除",
          description: "至少需要保留一个页面",
          variant: "destructive",
        });
        return;
      }

      try {
        await deletePageApi(pageId);
        deletePageFromStore(pageId);
        toast({ title: "页面已删除" });
      } catch (error) {
        toast({
          title: "删除失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      }
    },
    [pages.length, deletePageApi, deletePageFromStore, toast]
  );

  // 复制页面
  const handleDuplicatePage = useCallback(
    async (pageId: string) => {
      try {
        const newPage = await duplicatePageApi(pageId);
        addPage({
          id: newPage.id,
          projectId,
          pageOrder: newPage.pageOrder,
          width: newPage.width,
          height: newPage.height,
          dpi: newPage.dpi,
          presetName: newPage.presetName,
          thumbnailUrl: newPage.thumbnailUrl,
          createdAt: newPage.createdAt,
          updatedAt: newPage.updatedAt,
        });
        toast({ title: "页面已复制" });
      } catch (error) {
        toast({
          title: "复制失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      }
    },
    [duplicatePageApi, addPage, projectId, toast]
  );

  return (
    <div className="w-24 border-r bg-muted/30 flex flex-col h-full">
      {/* 头部 */}
      <div className="p-2 border-b">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              新页面
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新页面</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">页面规格</label>
                <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_PRESETS.filter((p) => p.id !== "custom").map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex items-center gap-2">
                          <FileImage className="h-4 w-4" />
                          <span>{preset.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {preset.width}x{preset.height}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPreset && (
                  <p className="text-xs text-muted-foreground">
                    {PAGE_PRESETS.find((p) => p.id === selectedPreset)?.usage}
                  </p>
                )}
              </div>
              <Button
                onClick={handleCreatePage}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "创建中..." : "创建页面"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 页面列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pages.map((page, index) => (
            <PageThumbnail
              key={page.id}
              page={page}
              index={index}
              isSelected={page.id === currentPageId}
              onSelect={() => setCurrentPage(page.id)}
              onDuplicate={() => handleDuplicatePage(page.id)}
              onDelete={() => handleDeletePage(page.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* 页面计数 */}
      <div className="p-2 border-t text-center text-xs text-muted-foreground">
        共 {pages.length} 页
      </div>
    </div>
  );
}
