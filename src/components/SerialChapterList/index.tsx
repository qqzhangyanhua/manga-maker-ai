/**
 * 连载章节列表组件（重构版）
 * 功能：
 * 1. 章节编辑
 * 2. 发布前检查
 * 3. 内联分镜编辑（拖拽、拆分、合并、插入）
 * 4. 批量操作
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { BookOpen, ArrowUp } from "lucide-react";
import { EditChapterDialog } from "@/components/EditChapterDialog";
import { ChapterCard } from "./ChapterCard";
import { PublishCheckDialog } from "./PublishCheckDialog";
import { GenerateBackgroundDialog, type GenerateBackgroundParams } from "./GenerateBackgroundDialog";
import { useChapterOperations } from "./hooks/useChapterOperations";
import type { SerialChapterListProps, Chapter, ChapterStats } from "./types";

export function SerialChapterList({
  storyId,
  projectId,
  chapters,
  panels,
  characters,
  charactersLoading = false,
  isGeneratingPanels = false,
  streamingPanels = [],
  storyStyle,
  onRefresh,
  onGenerateNext,
  onGeneratePanels,
  onGenerateBackground,
  onDeletePanel,
  onImageGenerated,
  onCharactersRefresh,
  onError,
}: SerialChapterListProps) {
  // 状态管理
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [generatingBackground, setGeneratingBackground] = useState<string | null>(null);
  const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false);
  const [currentChapterForBackground, setCurrentChapterForBackground] = useState<Chapter | null>(null);

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.chapter_order - b.chapter_order),
    [chapters]
  );

  // 计算章节统计
  const getChapterStats = useCallback((chapterId: string): ChapterStats => {
    const chapterPanels = panels.filter((p) => p.chapter_id === chapterId);
    const panelCount = chapterPanels.length;
    const generatedCount = chapterPanels.filter(
      (p) => p.generated_image || p.image_url
    ).length;
    const progress = panelCount > 0 ? (generatedCount / panelCount) * 100 : 0;
    const hasAllImages = panelCount > 0 && generatedCount === panelCount;

    return { panelCount, generatedCount, progress, hasAllImages };
  }, [panels]);

  // 章节操作 hook
  const {
    selectedChapters,
    publishCheckDialog,
    confirmPublish,
    closePublishCheckDialog,
    toggleChapterSelection,
  } = useChapterOperations({
    chapters,
    getChapterStats,
    onGeneratePanels,
    onRefresh,
  });

  // 展开/折叠章节
  const toggleChapterExpand = useCallback((chapterId: string) => {
    setExpandedChapters(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(chapterId)) {
        newExpanded.delete(chapterId);
      } else {
        newExpanded.add(chapterId);
      }
      return newExpanded;
    });
  }, []);

  // 打开背景生成对话框
  const handleOpenBackgroundDialog = useCallback((chapterId: string) => {
    const chapter = sortedChapters.find(c => c.id === chapterId);
    if (chapter) {
      setCurrentChapterForBackground(chapter);
      setBackgroundDialogOpen(true);
    }
  }, [sortedChapters]);

  // 确认生成背景
  const handleConfirmGenerateBackground = useCallback(async (params: GenerateBackgroundParams) => {
    if (!currentChapterForBackground) return;

    setGeneratingBackground(currentChapterForBackground.id);
    try {
      await onGenerateBackground(currentChapterForBackground.id, params);
    } finally {
      setGeneratingBackground(null);
      setCurrentChapterForBackground(null);
    }
  }, [currentChapterForBackground, onGenerateBackground]);

  return (
    <>
      <div>
        {sortedChapters.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-[#1a1a1f]/60 rounded-xl border border-gray-800/50">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">还没有章节</p>
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
              <ArrowUp className="w-4 h-4 animate-bounce" />
              <span>点击右上角「创建章节」按钮开始</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedChapters.map((chapter) => {
              const stats = getChapterStats(chapter.id);
              const isSelected = selectedChapters.has(chapter.id);
              const isExpanded = expandedChapters.has(chapter.id);

              return (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  panels={panels}
                  stats={stats}
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  showCheckbox={sortedChapters.length > 1}
                  onToggleExpand={() => toggleChapterExpand(chapter.id)}
                  onToggleSelect={() => toggleChapterSelection(chapter.id)}
                  onEdit={() => setEditingChapter(chapter)}
                  onGeneratePanels={() => onGeneratePanels(chapter.id)}
                  onGenerateBackground={() => handleOpenBackgroundDialog(chapter.id)}
                  generatingBackground={generatingBackground === chapter.id}
                  // 分镜编辑相关
                  projectId={projectId}
                  storyId={storyId}
                  characters={characters}
                  charactersLoading={charactersLoading}
                  isGeneratingPanels={isGeneratingPanels}
                  streamingPanels={streamingPanels}
                  onDeletePanel={onDeletePanel}
                  onImageGenerated={onImageGenerated}
                  onCharactersRefresh={onCharactersRefresh}
                  onRefresh={onRefresh}
                  onError={onError}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 编辑章节对话框 */}
      <EditChapterDialog
        open={!!editingChapter}
        onOpenChange={(open) => !open && setEditingChapter(null)}
        chapter={editingChapter}
        onSuccess={() => { void onRefresh(); }}
      />

      {/* 发布检查对话框 */}
      <PublishCheckDialog
        open={publishCheckDialog.open}
        chapter={publishCheckDialog.chapter}
        warnings={publishCheckDialog.warnings}
        onOpenChange={(open) => !open && closePublishCheckDialog()}
        onConfirm={confirmPublish}
      />

      {/* 生成背景对话框 */}
      <GenerateBackgroundDialog
        open={backgroundDialogOpen}
        onOpenChange={setBackgroundDialogOpen}
        chapterTitle={currentChapterForBackground?.title}
        storyStyle={storyStyle}
        onConfirm={handleConfirmGenerateBackground}
      />
    </>
  );
}

// 重新导出类型
export type { Chapter, Panel, ChapterStats, SerialChapterListProps } from "./types";
