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

type ChapterMoveAnchor =
  | { index?: number }
  | { before: string }
  | { after: string };

type PanelReorderAnchor =
  | { before: string }
  | { after: string }
  | { chapter_id: string; index?: number };

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
   * 移动分镜到另一个章节。
   * 省略 anchor 则追加到章尾；index 从 0 起，也可以用 before / after。
   */
  const movePanelToChapter = useCallback(
    async (panelId: string, targetChapterId: string, anchor?: ChapterMoveAnchor) => {
      setIsReordering(true);
      try {
        const response = await fetch("/api/panel/move-to-chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            panel_id: panelId,
            target_chapter_id: targetChapterId,
            ...anchor,
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
   * 按锚点重排分镜。单格走 reorder，多格走 batch-reorder，都不再提交整份顺序。
   */
  const reorderPanelsInChapter = useCallback(
    async (panelIds: string[], projectId: string, anchor: PanelReorderAnchor) => {
      setIsReordering(true);
      try {
        if (panelIds.length === 0) {
          throw new Error("没有要排序的分镜");
        }

        const singleId = panelIds.length === 1 ? panelIds[0] : undefined;
        const response = await fetch(singleId ? "/api/panel/reorder" : "/api/panel/batch-reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            singleId
              ? { panel_id: singleId, project_id: projectId, ...anchor }
              : { panel_ids: panelIds, project_id: projectId, ...anchor },
          ),
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
