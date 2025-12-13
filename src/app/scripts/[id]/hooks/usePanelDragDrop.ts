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
      // 布局组拖拽
      await handleGroupDragEnd(currentGroupIds, overPanel);
    } else {
      // 单个Panel拖拽（原有逻辑）
      await handleSingleDragEnd(activePanel, overPanel);
    }
  };

  /**
   * 处理单个Panel拖拽
   */
  const handleSingleDragEnd = async (activePanel: Panel, overPanel: Panel) => {
    const oldIndex = panels.findIndex((p) => p.id === activePanel.id);
    const newIndex = panels.findIndex((p) => p.id === overPanel.id);

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
          panel_id: activePanel.id,
          new_order: newOrder,
          project_id: projectId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reorder");
      }
    } catch (error) {
      console.error("Reorder error:", error);
      // 回滚到原始顺序
      onPanelsChange(panels);
      onError(error instanceof Error ? error.message : "重排序失败");
    }
  };

  /**
   * 处理布局组拖拽
   */
  const handleGroupDragEnd = async (groupIds: string[], overPanel: Panel) => {
    // 获取组内所有Panel（按顺序）
    const groupPanels = groupIds
      .map((id) => panels.find((p) => p.id === id))
      .filter((p): p is Panel => p !== undefined)
      .sort((a, b) => a.panel_order - b.panel_order);

    if (groupPanels.length === 0) return;

    const groupStartOrder = groupPanels[0].panel_order;
    const targetOrder = overPanel.panel_order;

    // 如果目标在组内，不处理
    if (groupIds.includes(overPanel.id)) {
      return;
    }

    // 计算新的目标位置
    // 如果目标在组之前，放在目标位置
    // 如果目标在组之后，放在目标位置减去组大小
    let newStartOrder: number;
    if (targetOrder < groupStartOrder) {
      newStartOrder = targetOrder;
    } else {
      // 目标在组之后，需要考虑组本身会被移走
      newStartOrder = targetOrder - groupPanels.length + 1;
    }

    // 乐观更新 UI
    const otherPanels = panels.filter((p) => !groupIds.includes(p.id));
    const insertIndex = otherPanels.findIndex((p) => p.panel_order >= newStartOrder);
    const finalInsertIndex = insertIndex === -1 ? otherPanels.length : insertIndex;

    const reordered = [
      ...otherPanels.slice(0, finalInsertIndex),
      ...groupPanels,
      ...otherPanels.slice(finalInsertIndex),
    ].map((p, idx) => ({
      ...p,
      panel_order: idx + 1,
    }));

    onPanelsChange(reordered);

    // 后端同步
    try {
      if (!projectId) {
        throw new Error("Project ID is missing");
      }

      const res = await fetch("/api/panel/batch-reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: groupIds,
          target_order: newStartOrder,
          project_id: projectId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reorder group");
      }
    } catch (error) {
      console.error("Group reorder error:", error);
      // 回滚到原始顺序
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
