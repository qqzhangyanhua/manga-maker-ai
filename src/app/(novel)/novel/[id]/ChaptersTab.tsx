/**
 * 章节管理 Tab 组件
 *
 * 支持：
 * 1. 普通模式：选择单个章节进行编辑
 * 2. 选择模式：批量选择章节进行批量操作（删除等）
 */
"use client";

import { useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BookOpen, Upload, ListChecks, CheckCircle } from "lucide-react";
import { ChapterList } from "./components/ChapterList";
import { ChapterEditor } from "./components/ChapterEditor";
import { BatchImportDialog } from "./components/BatchImportDialog";
import { BatchOperationToolbar } from "./components/BatchOperationToolbar";
import { BatchDeleteDialog } from "./components/BatchDeleteDialog";
import { useBatchSelection } from "@/hooks/use-batch-selection";
import type { NovelProject, ChapterOutline } from "./types";
import { novelTheme } from "../theme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChaptersTabProps {
  project: NovelProject;
  outlines: ChapterOutline[];
  selectedChapter: ChapterOutline | null;
  loading: boolean;
  onCreateChapter: () => void;
  onSelectChapter: (chapter: ChapterOutline | null) => void;
  onUpdateChapter: (chapter: ChapterOutline) => void;
  onRefresh?: () => void;
}

export function ChaptersTab({
  project,
  outlines,
  selectedChapter,
  loading,
  onCreateChapter,
  onSelectChapter,
  onUpdateChapter,
  onRefresh,
}: ChaptersTabProps) {
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const {
    selectedIds,
    toggleSelection,
    selectRange,
    lastSelectedId,
    exitSelectionMode,
  } = useBatchSelection();

  // 进入选择模式
  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
  };

  // 退出选择模式
  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    exitSelectionMode();
  };

  // 处理章节选择切换（支持 Shift 范围选择）
  const handleToggleSelection = (chapterId: string, event?: MouseEvent) => {
    if (event?.shiftKey && lastSelectedId) {
      // Shift+Click: 范围选择
      const allIds = outlines
        .filter((ch) => ch.id)
        .map((ch) => ch.id as string);
      selectRange(lastSelectedId, chapterId, allIds);
    } else {
      // 普通点击: 单选切换
      toggleSelection(chapterId);
    }
  };

  // 打开批量删除对话框
  const handleOpenBatchDelete = () => {
    if (selectedIds.size === 0) {
      toast.error("请先选择要删除的章节");
      return;
    }
    setBatchDeleteOpen(true);
  };

  // 批量删除确认
  const handleBatchDelete = async (
    chapterIds: string[],
    softDelete: boolean
  ) => {
    try {
      const response = await fetch("/api/novel/batch/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_ids: chapterIds,
          soft_delete: softDelete,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.detail || "删除失败");
      }

      const result = await response.json();
      toast.success(
        `已${softDelete ? "软" : "永久"}删除 ${result.chapters_deleted || chapterIds.length} 个章节`
      );

      // 如果删除了当前编辑的章节，清空选中状态
      if (selectedChapter && chapterIds.includes(selectedChapter.id || "")) {
        onSelectChapter(null);
      }

      // 刷新列表
      onRefresh?.();

      // 退出选择模式
      handleExitSelectionMode();
      setBatchDeleteOpen(false);
    } catch (error) {
      console.error("Batch delete error:", error);
      toast.error(
        error instanceof Error ? error.message : "删除失败，请重试"
      );
    }
  };

  // 获取选中的章节信息
  const selectedChapters = outlines
    .filter((ch) => ch.id && selectedIds.has(ch.id))
    .map((ch) => ({
      id: ch.id as string,
      title: ch.title,
      chapterNumber: ch.chapterNumber,
    }));

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：章节列表 */}
        <div className="col-span-3">
          <Card className={novelTheme.card.base}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">章节列表</CardTitle>
                <div className="flex gap-2">
                  {!selectionMode ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBatchImportOpen(true)}
                        title="批量导入章节"
                        className={novelTheme.button.outline}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEnterSelectionMode}
                        title="选择章节进行批量操作"
                        className={novelTheme.button.outline}
                      >
                        <ListChecks className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={onCreateChapter}
                        className={novelTheme.button.primary}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExitSelectionMode}
                        className={novelTheme.button.outline}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        完成
                      </Button>
                      <Button
                        size="sm"
                        onClick={onCreateChapter}
                        className={novelTheme.button.primary}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* 批量操作工具栏 */}
            {selectionMode && selectedIds.size > 0 && (
              <div className="px-4 pb-2">
                <BatchOperationToolbar
                  selectedCount={selectedIds.size}
                  onDelete={handleOpenBatchDelete}
                  onCancel={handleExitSelectionMode}
                />
              </div>
            )}

            <CardContent className="p-0">
              <ChapterList
                chapters={outlines}
                selectedChapter={selectedChapter}
                onSelect={onSelectChapter}
                loading={loading}
                genre={project.genre || "default"}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onToggleSelection={handleToggleSelection}
              />
            </CardContent>
          </Card>
        </div>

        {/* 右侧：章节编辑器 */}
        <div className="col-span-9">
          {selectedChapter && !selectionMode ? (
            <ChapterEditor
              chapter={selectedChapter}
              project={project}
              onUpdate={onUpdateChapter}
            />
          ) : (
            <Card
              className={cn(
                "h-full flex items-center justify-center",
                novelTheme.card.base
              )}
            >
              <CardContent className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {selectionMode
                    ? "选择模式：勾选章节进行批量操作"
                    : "选择一个章节开始编辑，或创建新章节"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 批量导入对话框 */}
      <BatchImportDialog
        projectId={project.id}
        open={batchImportOpen}
        onOpenChange={setBatchImportOpen}
        onSuccess={onRefresh}
      />

      {/* 批量删除对话框 */}
      <BatchDeleteDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        selectedChapters={selectedChapters}
        onConfirm={handleBatchDelete}
      />
    </>
  );
}
