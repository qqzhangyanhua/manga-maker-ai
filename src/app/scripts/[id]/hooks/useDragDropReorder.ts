/**
 * 拖拽排序 Hook
 * 封装章节和分镜的拖拽排序逻辑
 */

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseDragDropReorderOptions {
  storyId: string;
  onSuccess?: () => void;
}

export function useDragDropReorder({ storyId, onSuccess }: UseDragDropReorderOptions) {
  const { toast } = useToast();
  const [isReordering, setIsReordering] = useState(false);

  /**
   * 重排序章节
   */
  const reorderChapters = useCallback(
    async (chapterOrders: Array<{ id: string; chapter_order: number }>) => {
      setIsReordering(true);
      try {
        const response = await fetch("/api/chapter/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            story_id: storyId,
            chapter_orders: chapterOrders,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "重排序失败");
        }

        onSuccess?.();
      } catch (error) {
        toast({
          title: "排序失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsReordering(false);
      }
    },
    [storyId, onSuccess, toast]
  );

  /**
   * 移动分镜到另一个章节
   */
  const movePanelToChapter = useCallback(
    async (panelId: string, targetChapterId: string, targetOrder?: number) => {
      setIsReordering(true);
      try {
        const response = await fetch("/api/panel/move-to-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            panel_id: panelId,
            target_chapter_id: targetChapterId,
            target_order: targetOrder,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "移动失败");
        }

        toast({
          title: "移动成功",
          description: "分镜已移动到目标章节",
        });

        onSuccess?.();
      } catch (error) {
        toast({
          title: "移动失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsReordering(false);
      }
    },
    [onSuccess, toast]
  );

  /**
   * 章节内重排序分镜（使用现有 API）
   */
  const reorderPanelsInChapter = useCallback(
    async (updates: Array<{ id: string; panel_order: number }>, projectId: string) => {
      setIsReordering(true);
      try {
        const response = await fetch("/api/panel/batch-update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates, projectId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "重排序失败");
        }

        onSuccess?.();
      } catch (error) {
        toast({
          title: "排序失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsReordering(false);
      }
    },
    [onSuccess, toast]
  );

  return {
    isReordering,
    reorderChapters,
    movePanelToChapter,
    reorderPanelsInChapter,
  };
}
