/**
 * 分镜拖拽排序 Hook
 * 使用 dnd-kit 实现拖拽重排序功能
 */

import { useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Panel } from "../types/script-editor.types";

interface UsePanelDragDropProps {
  panels: Panel[];
  projectId: string | null;
  onPanelsChange: (panels: Panel[]) => void;
  onError: (message: string) => void;
}

export function usePanelDragDrop({
  panels,
  projectId,
  onPanelsChange,
  onError,
}: UsePanelDragDropProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);

    const { active, over } = event;

    // 如果没有放置目标或位置未变化，不做处理
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = panels.findIndex((p) => p.id === active.id);
    const newIndex = panels.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // 乐观更新：立即更新 UI
    const reordered = arrayMove(panels, oldIndex, newIndex).map((p, idx) => ({
      ...p,
      panel_order: idx + 1,
    }));
    onPanelsChange(reordered);

    // 后端同步
    try {
      if (!projectId) {
        throw new Error("Project ID is missing");
      }

      const newOrder = newIndex + 1;
      const res = await fetch("/api/panel/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_id: active.id as string,
          new_order: newOrder,
          project_id: projectId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reorder");
      }

      // 后端同步成功后，刷新数据确保一致性
      const data = await res.json();
      if (data.success) {
        // 可选：重新获取所有 panels 确保顺序正确
        // 当前实现使用乐观更新，不重新获取
      }
    } catch (error) {
      console.error("Reorder error:", error);
      // 回滚到原始顺序
      onPanelsChange(panels);
      onError(error instanceof Error ? error.message : "重排序失败");
    }
  };

  const handleDragCancel = () => {
    setIsDragging(false);
  };

  return {
    isDragging,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
