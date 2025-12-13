/**
 * 分镜布局组组件
 * 用于渲染 2镜/4镜/6镜 布局组
 */

"use client";

import { useMemo } from "react";
import { Grid2X2, Grid3X3, LayoutGrid, Ungroup } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PanelCard } from "./PanelEditor/PanelCard";
import { PanelCardActions } from "./PanelEditor/PanelCardActions";
import type { Panel, GenerationTask } from "../types/script-editor.types";
import type { PanelGroup, LayoutType } from "../types/layout.types";
import { getLayoutTypeName } from "../types/layout.types";

interface PanelLayoutGroupProps {
  group: PanelGroup;
  isLayoutMode: boolean;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onBreakLayout: () => void;
  generatingPanels: Map<string, GenerationTask>;
  onEditPanel: (panel: Panel) => void;
  onDeletePanel: (id: string) => void;
  onGenerateSingle: (panel: Panel) => void;
  onInsertAfter: (panel: Panel) => void;
  onSplit: (panel: Panel) => void;
  onMergeWithNext: (panel: Panel) => void;
  onRetryGeneration: (panelId: string, prompt: string) => void;
  onCancelGeneration: (panelId: string) => void;
  allPanels: Panel[];
}

/**
 * 获取布局类型对应的图标
 */
function getLayoutIcon(type: LayoutType) {
  switch (type) {
    case "2":
      return <Grid2X2 className="w-4 h-4" />;
    case "4":
      return <LayoutGrid className="w-4 h-4" />;
    case "6":
      return <Grid3X3 className="w-4 h-4" />;
    default:
      return null;
  }
}

/**
 * 获取布局网格样式
 */
function getGridStyle(type: LayoutType): string {
  switch (type) {
    case "2":
      return "grid grid-cols-2 gap-3";
    case "4":
      return "grid grid-cols-2 gap-3";
    case "6":
      return "grid grid-cols-3 gap-3";
    default:
      return "";
  }
}

export function PanelLayoutGroup({
  group,
  isLayoutMode,
  isSelected,
  onSelect,
  onBreakLayout,
  generatingPanels,
  onEditPanel,
  onDeletePanel,
  onGenerateSingle,
  onInsertAfter,
  onSplit,
  onMergeWithNext,
  onRetryGeneration,
  onCancelGeneration,
  allPanels,
}: PanelLayoutGroupProps) {
  const { type, panels } = group;
  const isSinglePanel = type === "single";

  // 计算最后一个Panel的索引（用于判断是否可以合并）
  const lastPanelIndex = useMemo(() => {
    const lastPanel = panels[panels.length - 1];
    return allPanels.findIndex((p) => p.id === lastPanel.id);
  }, [panels, allPanels]);

  // 单个Panel直接渲染
  if (isSinglePanel && panels.length === 1) {
    const panel = panels[0];
    const panelIndex = allPanels.findIndex((p) => p.id === panel.id);
    const generationTask = generatingPanels.get(panel.id);
    const isGenerating =
      generationTask?.status === "processing" ||
      generationTask?.status === "pending";
    const canMergeWithNext = panelIndex < allPanels.length - 1;

    return (
      <div
        className={`relative ${isLayoutMode && isSelected ? "ring-2 ring-primary rounded-lg" : ""}`}
      >
        {/* 布局模式下的选择复选框 */}
        {isLayoutMode && (
          <div className="absolute left-2 top-4 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(checked === true)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <div className={isLayoutMode ? "ml-8" : ""}>
          <PanelCard
            panel={panel}
            index={panelIndex}
            generationTask={generationTask}
            onRetryGeneration={() => {
              const prompt =
                panel.prompt_used || panel.visual_prompt || panel.description;
              onRetryGeneration(panel.id, prompt);
            }}
            onCancelGeneration={() => onCancelGeneration(panel.id)}
            actions={
              <PanelCardActions
                panel={panel}
                onEdit={onEditPanel}
                onDelete={onDeletePanel}
                onGenerate={onGenerateSingle}
                isGenerating={isGenerating}
                onInsertAfter={onInsertAfter}
                onSplit={onSplit}
                onMergeWithNext={onMergeWithNext}
                canMergeWithNext={canMergeWithNext}
              />
            }
          />
        </div>
      </div>
    );
  }

  // 布局组渲染
  return (
    <div
      className={`relative border-2 rounded-lg p-4 ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-dashed border-muted-foreground/30 bg-muted/10"
      }`}
    >
      {/* 布局组标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* 布局模式下的选择复选框 */}
          {isLayoutMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(checked === true)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <Badge variant="secondary" className="flex items-center gap-1">
            {getLayoutIcon(type)}
            {getLayoutTypeName(type)}布局
          </Badge>
          <span className="text-sm text-muted-foreground">
            #{panels[0].panel_order} - #{panels[panels.length - 1].panel_order}
          </span>
        </div>

        {/* 拆分按钮 */}
        {!isLayoutMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onBreakLayout}
                className="h-8"
              >
                <Ungroup className="w-4 h-4 mr-1" />
                拆分布局
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              将布局组拆分为独立分镜
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* 布局组内的Panel网格 */}
      <div className={getGridStyle(type)}>
        {panels.map((panel, idx) => {
          const panelIndex = allPanels.findIndex((p) => p.id === panel.id);
          const generationTask = generatingPanels.get(panel.id);
          const isGenerating =
            generationTask?.status === "processing" ||
            generationTask?.status === "pending";
          // 组内最后一个Panel可以与组外下一个Panel合并
          const isLastInGroup = idx === panels.length - 1;
          const canMergeWithNext =
            isLastInGroup && lastPanelIndex < allPanels.length - 1;

          return (
            <div key={panel.id} className="min-w-0">
              <PanelCard
                panel={panel}
                index={panelIndex}
                generationTask={generationTask}
                onRetryGeneration={() => {
                  const prompt =
                    panel.prompt_used ||
                    panel.visual_prompt ||
                    panel.description;
                  onRetryGeneration(panel.id, prompt);
                }}
                onCancelGeneration={() => onCancelGeneration(panel.id)}
                compact // 紧凑模式用于布局组内显示
                actions={
                  <PanelCardActions
                    panel={panel}
                    onEdit={onEditPanel}
                    onDelete={onDeletePanel}
                    onGenerate={onGenerateSingle}
                    isGenerating={isGenerating}
                    onInsertAfter={onInsertAfter}
                    onSplit={onSplit}
                    onMergeWithNext={onMergeWithNext}
                    canMergeWithNext={canMergeWithNext}
                  />
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
