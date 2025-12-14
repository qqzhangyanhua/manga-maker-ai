/**
 * 可拖拽的分镜卡片组件
 * 包装 PanelCard 并添加拖拽功能和批量选择功能
 */

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PanelCard } from "./PanelCard";
import type { Panel, GenerationTask } from "../../types/script-editor.types";

interface SortablePanelCardProps {
  panel: Panel;
  index: number;
  actions?: React.ReactNode;
  generationTask?: GenerationTask;
  onRetryGeneration?: () => void;
  onCancelGeneration?: () => void;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

export function SortablePanelCard({
  panel,
  index,
  actions,
  generationTask,
  onRetryGeneration,
  onCancelGeneration,
  isSelected = false,
  onSelectionChange,
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
    opacity: isDragging ? 0.5 : panel._isGenerating ? 0.7 : 1,
  };

  // 临时生成中的分镜样式
  const isGeneratingClass = panel._isGenerating
    ? "border-2 border-dashed border-primary/50 animate-in fade-in slide-in-from-bottom-4 duration-500"
    : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isSelected ? "ring-2 ring-primary rounded-lg" : ""} ${isGeneratingClass}`}
    >
      {/* 批量选择复选框 */}
      {onSelectionChange && !panel._isGenerating && (
        <div className="absolute left-12 top-4 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              onSelectionChange(checked === true);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 生成中标记 */}
      {panel._isGenerating && (
        <div className="absolute left-12 top-4 z-10">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            生成中
          </Badge>
        </div>
      )}

      {/* 拖拽手柄（生成中的分镜禁用拖拽） */}
      {!panel._isGenerating && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10 p-2 hover:bg-muted/50 rounded"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

      {/* 原有的 PanelCard，添加左边距为拖拽手柄和复选框留空间 */}
      <div className={onSelectionChange ? "ml-20" : "ml-10"}>
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
