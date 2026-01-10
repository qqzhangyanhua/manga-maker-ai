/**
 * 分镜选择器组件
 * 显示章节的所有分镜，支持选择、批量操作
 */

"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Panel } from "./NineGridDialog.types";
import { REQUIRED_PANELS_COUNT } from "./NineGridDialog.constants";

interface PanelSelectorProps {
  panels: Panel[];
  selectedPanelIds: string[];
  isLoading: boolean;
  onTogglePanel: (panelId: string) => void;
  onSelectFirst9: () => void;
  onClearSelection: () => void;
  isSelected: (panelId: string) => boolean;
  getSelectionIndex: (panelId: string) => number;
  canSelectMore: boolean;
}

export function PanelSelector({
  panels,
  selectedPanelIds,
  isLoading,
  onTogglePanel,
  onSelectFirst9,
  onClearSelection,
  isSelected,
  getSelectionIndex,
  canSelectMore,
}: PanelSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">加载分镜中...</span>
      </div>
    );
  }

  if (panels.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        该章节暂无分镜，请先生成分镜
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 标题和操作按钮 */}
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm font-medium leading-none">
          <CheckSquare className="w-4 h-4" />
          选择 {REQUIRED_PANELS_COUNT} 个分镜 *
          <span className="text-sm font-normal text-muted-foreground">
            (已选 {selectedPanelIds.length}/{REQUIRED_PANELS_COUNT})
          </span>
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSelectFirst9}
            disabled={panels.length < REQUIRED_PANELS_COUNT}
          >
            选择前{REQUIRED_PANELS_COUNT}个
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            disabled={selectedPanelIds.length === 0}
          >
            清空选择
          </Button>
        </div>
      </div>

      {/* 分镜列表 */}
      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto border rounded-lg p-4">
        {panels.map((panel) => {
          const selected = isSelected(panel.id);
          const selectionIndex = getSelectionIndex(panel.id);

          return (
            <div
              key={panel.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer",
                selected
                  ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                  : "border-transparent bg-muted/30 hover:bg-muted/50"
              )}
              onClick={() => onTogglePanel(panel.id)}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTogglePanel(panel.id);
                }
              }}
            >
              <Checkbox
                checked={selected}
                disabled={!selected && !canSelectMore}
                className="mt-1 pointer-events-none"
                aria-hidden="true"
              />

              {panel.generated_image && (
                <img
                  src={panel.generated_image}
                  alt={`分镜 ${panel.panel_order}`}
                  className="w-20 h-20 rounded object-cover"
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">分镜 {panel.panel_order}</span>
                  {selected && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-orange-500 text-white rounded">
                      位置 {selectionIndex + 1}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {panel.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 提示信息 */}
      <p className="text-sm text-muted-foreground mt-2">
        点击分镜卡片进行选择，选中的分镜将按顺序排列在九宫格中
      </p>
      {selectedPanelIds.length !== REQUIRED_PANELS_COUNT && panels.length > 0 && (
        <p className="text-sm text-destructive mt-1">
          请选择恰好 {REQUIRED_PANELS_COUNT} 个分镜
        </p>
      )}
    </div>
  );
}
