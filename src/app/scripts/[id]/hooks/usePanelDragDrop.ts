/**
 * 分镜拖拽排序 Hook
 * 使用 dnd-kit 实现拖拽重排序功能
 * 支持布局组整体拖拽
 */

import { useState, useCallback } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Panel } from "../types/script-editor.types";
import { isGroupStart, isGroupMember } from "../types/layout.types";
import { anchorForMove, type DragAnchor } from "./drag-anchor";

interface UsePanelDragDropProps {
  panels: Panel[];
  projectId: string | null;
  onPanelsChange: (panels: Panel[]) => void;
  onError: (message: string) => void;
}

/**
 * 获取Panel所属的布局组内所有Panel IDs
 * 如果不属于任何组，返回只包含自身的数组
 */
function getGroupPanelIds(panel: Panel, allPanels: Panel[]): string[] {
  // 如果是组起始
  if (isGroupStart(panel)) {
    const groupIds = [panel.id];
    const startIndex = allPanels.findIndex((p) => p.id === panel.id);

    // 向后查找所有 group_member
    for (let i = startIndex + 1; i < allPanels.length; i++) {
      if (isGroupMember(allPanels[i])) {
        groupIds.push(allPanels[i].id);
      } else {
        break;
      }
    }
    return groupIds;
  }

  // 如果是组成员，向前查找组起始
  if (isGroupMember(panel)) {
    const panelIndex = allPanels.findIndex((p) => p.id === panel.id);

    // 向前查找组起始
    let startIndex = panelIndex;
    for (let i = panelIndex - 1; i >= 0; i--) {
      if (isGroupStart(allPanels[i])) {
        startIndex = i;
        break;
      } else if (!isGroupMember(allPanels[i])) {
        // 找到非组成员，说明数据有问题，返回单个
        return [panel.id];
      }
    }

    // 收集组内所有Panel
    const groupIds: string[] = [];
    for (let i = startIndex; i < allPanels.length; i++) {
      if (i === startIndex || isGroupMember(allPanels[i])) {
        groupIds.push(allPanels[i].id);
      } else {
        break;
      }
    }
    return groupIds;
  }

  // 不属于任何组
  return [panel.id];
}

function reorderByAnchor(panels: Panel[], movingIds: readonly string[], anchor: DragAnchor): Panel[] | null {
  const moving = new Set(movingIds);
  const movingPanels = panels.filter((panel) => moving.has(panel.id));
  const rest = panels.filter((panel) => !moving.has(panel.id));
  const anchorId = "before" in anchor ? anchor.before : anchor.after;
  const anchorIndex = rest.findIndex((panel) => panel.id === anchorId);
  if (anchorIndex < 0) return null;
  const insertAt = "before" in anchor ? anchorIndex : anchorIndex + 1;
  return [...rest.slice(0, insertAt), ...movingPanels, ...rest.slice(insertAt)].map((panel, index) => ({
    ...panel,
    panel_order: index + 1,
  }));
}

export function usePanelDragDrop({
  panels,
  projectId,
  onPanelsChange,
  onError,
}: UsePanelDragDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggingGroupIds, setDraggingGroupIds] = useState<string[]>([]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setIsDragging(true);

      // 找到被拖拽的Panel
      const draggedPanel = panels.find((p) => p.id === event.active.id);
      if (draggedPanel) {
        const groupIds = getGroupPanelIds(draggedPanel, panels);
        setDraggingGroupIds(groupIds);
      }
    },
    [panels]
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);
    const currentGroupIds = draggingGroupIds;
    setDraggingGroupIds([]);

    const { active, over } = event;

    // 如果没有放置目标或位置未变化，不做处理
    if (!over || active.id === over.id) {
      return;
    }

    const activePanel = panels.find((p) => p.id === active.id);
    const overPanel = panels.find((p) => p.id === over.id);

    if (!activePanel || !overPanel) {
      return;
    }

    // 检查是否是布局组拖拽
    const isGroupDrag = currentGroupIds.length > 1;

    if (isGroupDrag) {
      await handleGroupDragEnd(currentGroupIds, String(active.id), String(over.id));
    } else {
      await handleSingleDragEnd(activePanel, overPanel);
    }
  };

  /**
   * 处理单个Panel拖拽
   */
  const handleSingleDragEnd = async (activePanel: Panel, overPanel: Panel) => {
    const orderedIds = panels.map((panel) => panel.id);
    const oldIndex = orderedIds.indexOf(activePanel.id);
    const newIndex = orderedIds.indexOf(overPanel.id);
    const anchor = anchorForMove(oldIndex, newIndex, orderedIds);
    if (!anchor) return;

    const reordered = arrayMove(panels, oldIndex, newIndex).map((panel, index) => ({
      ...panel,
      panel_order: index + 1,
    }));
    onPanelsChange(reordered);

    try {
      if (!projectId) {
        throw new Error("缺少项目编号");
      }

      const res = await fetch("/api/panel/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_id: activePanel.id,
          project_id: projectId,
          ...anchor,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "重排序失败");
      }
    } catch (error) {
      console.error("Reorder error:", error);
      onPanelsChange(panels);
      onError(error instanceof Error ? error.message : "重排序失败");
    }
  };

  const handleGroupDragEnd = async (groupIds: string[], activeId: string, overId: string) => {
    if (groupIds.includes(overId)) return;

    const orderedIds = panels.map((panel) => panel.id);
    const anchor = anchorForMove(orderedIds.indexOf(activeId), orderedIds.indexOf(overId), orderedIds);
    if (!anchor) return;

    const visualGroupIds = orderedIds.filter((id) => groupIds.includes(id));
    const reordered = reorderByAnchor(panels, visualGroupIds, anchor);
    if (!reordered) return;
    onPanelsChange(reordered);

    try {
      if (!projectId) {
        throw new Error("缺少项目编号");
      }

      const res = await fetch("/api/panel/batch-reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: visualGroupIds,
          project_id: projectId,
          ...anchor,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "布局组重排序失败");
      }
    } catch (error) {
      console.error("Group reorder error:", error);
      onPanelsChange(panels);
      onError(error instanceof Error ? error.message : "布局组重排序失败");
    }
  };

  const handleDragCancel = useCallback(() => {
    setIsDragging(false);
    setDraggingGroupIds([]);
  }, []);

  return {
    isDragging,
    draggingGroupIds,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
