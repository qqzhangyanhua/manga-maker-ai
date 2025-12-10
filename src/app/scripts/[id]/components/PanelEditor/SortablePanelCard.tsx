/**
 * 可拖拽的分镜卡片组件
 * 包装 PanelCard 并添加拖拽功能
 */

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { PanelCard } from "./PanelCard";
import type { Panel, GenerationTask } from "../../types/script-editor.types";

interface SortablePanelCardProps {
  panel: Panel;
  index: number;
  actions?: React.ReactNode;
  generationTask?: GenerationTask;
  onRetryGeneration?: () => void;
  onCancelGeneration?: () => void;
}

export function SortablePanelCard({
  panel,
  index,
  actions,
  generationTask,
  onRetryGeneration,
  onCancelGeneration,
}: SortablePanelCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: panel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10 p-2 hover:bg-muted/50 rounded"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* 原有的 PanelCard，添加左边距为拖拽手柄留空间 */}
      <div className="ml-10">
        <PanelCard
          panel={panel}
          index={index}
          actions={actions}
          generationTask={generationTask}
          onRetryGeneration={onRetryGeneration}
          onCancelGeneration={onCancelGeneration}
        />
      </div>
    </div>
  );
}
