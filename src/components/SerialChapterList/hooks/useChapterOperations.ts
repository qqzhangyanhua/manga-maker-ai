/**
 * 章节操作 Hook
 * 处理发布、批量操作等逻辑
 */

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Chapter, ChapterStats } from "../types";

interface UseChapterOperationsProps {
  chapters: Chapter[];
  getChapterStats: (chapterId: string) => ChapterStats;
  onGeneratePanels: (chapterId: string) => void;
  onRefresh: () => Promise<void> | void;
}

export function useChapterOperations({
  chapters,
  getChapterStats,
  onGeneratePanels,
  onRefresh,
}: UseChapterOperationsProps) {
  const { toast } = useToast();
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [batchOperating, setBatchOperating] = useState(false);
  const [publishCheckDialog, setPublishCheckDialog] = useState<{
    open: boolean;
    chapter: Chapter | null;
    warnings: string[];
  }>({ open: false, chapter: null, warnings: [] });

  const sortedChapters = [...chapters].sort((a, b) => a.chapter_order - b.chapter_order);

  // 发布/取消发布
  const handlePublish = useCallback(async (chapterId: string, currentStatus: string) => {
    setPublishingId(chapterId);

    try {
      const method = currentStatus === "published" ? "DELETE" : "POST";
      const response = await fetch(`/api/chapter/${chapterId}/publish`, {
        method,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "操作失败");
      }

      toast({
        title: currentStatus === "published" ? "已取消发布" : "发布成功",
        description: data.message,
      });

      await Promise.resolve(onRefresh());
    } catch (error) {
      console.error("Failed to toggle publish status:", error);
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setPublishingId(null);
    }
  }, [onRefresh, toast]);

  // 发布前检查
  const handlePublishWithCheck = useCallback((chapter: Chapter) => {
    const stats = getChapterStats(chapter.id);
    const warnings: string[] = [];

    if (stats.panelCount === 0) {
      toast({
        title: "无法发布",
        description: "章节还没有生成分镜，请先生成分镜",
        variant: "destructive",
      });
      return;
    }

    if (!stats.hasAllImages) {
      warnings.push(
        `分镜图片未全部生成 (${stats.generatedCount}/${stats.panelCount})`
      );
    }

    if (warnings.length > 0) {
      setPublishCheckDialog({
        open: true,
        chapter,
        warnings,
      });
    } else {
      handlePublish(chapter.id, chapter.publish_status || "draft");
    }
  }, [getChapterStats, handlePublish, toast]);

  // 确认发布（从对话框）
  const confirmPublish = useCallback(() => {
    if (publishCheckDialog.chapter) {
      handlePublish(
        publishCheckDialog.chapter.id,
        publishCheckDialog.chapter.publish_status || "draft"
      );
    }
    setPublishCheckDialog({ open: false, chapter: null, warnings: [] });
  }, [publishCheckDialog.chapter, handlePublish]);

  // 关闭发布检查对话框
  const closePublishCheckDialog = useCallback(() => {
    setPublishCheckDialog({ open: false, chapter: null, warnings: [] });
  }, []);

  // 批量选择
  const toggleChapterSelection = useCallback((chapterId: string) => {
    setSelectedChapters(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(chapterId)) {
        newSelection.delete(chapterId);
      } else {
        newSelection.add(chapterId);
      }
      return newSelection;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedChapters.size === sortedChapters.length) {
      setSelectedChapters(new Set());
    } else {
      setSelectedChapters(new Set(sortedChapters.map((c) => c.id)));
    }
  }, [selectedChapters.size, sortedChapters]);

  const clearSelection = useCallback(() => {
    setSelectedChapters(new Set());
  }, []);

  // 批量生成分镜
  const batchGeneratePanels = useCallback(async () => {
    const chaptersToGenerate = sortedChapters.filter(
      (c) => selectedChapters.has(c.id) && getChapterStats(c.id).panelCount === 0
    );

    if (chaptersToGenerate.length === 0) {
      toast({
        title: "没有可生成的章节",
        description: "所选章节都已有分镜",
        variant: "destructive",
      });
      return;
    }

    setBatchOperating(true);
    toast({
      title: "批量生成分镜",
      description: `正在为 ${chaptersToGenerate.length} 个章节生成分镜...`,
    });

    for (const chapter of chaptersToGenerate) {
      try {
        onGeneratePanels(chapter.id);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to generate panels for ${chapter.id}:`, error);
      }
    }

    setBatchOperating(false);
    setSelectedChapters(new Set());
    await Promise.resolve(onRefresh());
  }, [sortedChapters, selectedChapters, getChapterStats, onGeneratePanels, onRefresh, toast]);

  // 批量发布
  const batchPublish = useCallback(async () => {
    const chaptersToPublish = sortedChapters.filter(
      (c) => selectedChapters.has(c.id) && c.publish_status === "draft"
    );

    if (chaptersToPublish.length === 0) {
      toast({
        title: "没有可发布的章节",
        description: "所选章节都已发布或不符合发布条件",
        variant: "destructive",
      });
      return;
    }

    setBatchOperating(true);

    for (const chapter of chaptersToPublish) {
      try {
        await handlePublish(chapter.id, chapter.publish_status || "draft");
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to publish ${chapter.id}:`, error);
      }
    }

    setBatchOperating(false);
    setSelectedChapters(new Set());
    toast({
      title: "批量发布完成",
      description: `成功发布 ${chaptersToPublish.length} 个章节`,
    });
  }, [sortedChapters, selectedChapters, handlePublish, toast]);

  return {
    // 状态
    publishingId,
    selectedChapters,
    batchOperating,
    publishCheckDialog,
    isBatchMode: selectedChapters.size > 0,

    // 发布操作
    handlePublish,
    handlePublishWithCheck,
    confirmPublish,
    closePublishCheckDialog,

    // 批量操作
    toggleChapterSelection,
    selectAll,
    clearSelection,
    batchGeneratePanels,
    batchPublish,
  };
}
