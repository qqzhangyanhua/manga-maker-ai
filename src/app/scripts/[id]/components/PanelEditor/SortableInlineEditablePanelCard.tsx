/**
 * 可拖拽 + 可 Inline 编辑的分镜卡片
 */

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { InlineEditablePanelCard } from "../InlineEditablePanelCard";
import type { Panel } from "../../types/script-editor.types";

interface SortableInlineEditablePanelCardProps {
  panel: Panel;
  index: number;
  actions?: React.ReactNode;
  onPanelUpdate?: (panelId: string, field: string, value: string) => Promise<void>;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

export function SortableInlineEditablePanelCard({
  panel,
  index,
  actions,
  onPanelUpdate,
  isSelected = false,
  onSelectionChange,
}: SortableInlineEditablePanelCardProps) {
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

  // 检查是否是新追加的分镜
  const isNewlyAdded = !panel._isGenerating && panel.created_at &&
    (Date.now() - new Date(panel.created_at).getTime()) < 30000;

  const isGeneratingClass = panel._isGenerating
    ? "border-2 border-dashed border-primary/50 animate-in fade-in slide-in-from-bottom-4 duration-500"
    : isNewlyAdded
    ? "border-2 border-primary/30 animate-in fade-in slide-in-from-bottom-4 duration-500"
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

      {/* 新追加标记 */}
      {isNewlyAdded && (
        <div className="absolute left-12 top-4 z-10">
          <Badge variant="default" className="flex items-center gap-1 bg-green-500">
            新追加
          </Badge>
        </div>
      )}

      {/* 拖拽手柄 */}
      {!panel._isGenerating && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10 p-2 hover:bg-muted/50 rounded"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

      {/* Inline 可编辑的 PanelCard */}
      <div className={onSelectionChange ? "ml-20" : "ml-10"}>
        <InlineEditablePanelCard
          panel={panel}
          index={index}
          actions={actions}
          onPanelUpdate={onPanelUpdate}
        />
      </div>
    </div>
  );
}
