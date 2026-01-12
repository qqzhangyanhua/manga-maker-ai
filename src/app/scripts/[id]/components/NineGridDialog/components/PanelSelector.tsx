/**
 * 分镜选择器组件
 * 负责展示和选择九宫格所需的分镜
 */

"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PanelSelectorProps } from "../types";

export function PanelSelector({
  panels,
  selectedPanelIds,
  isLoading,
  onPanelToggle,
  onSelectFirst9,
  onClearSelection,
}: PanelSelectorProps) {
  const canSelectFirst9 = panels.length >= 9;
  const canClearSelection = selectedPanelIds.length > 0;
  const isValidSelection = selectedPanelIds.length === 9;

  return (
    <div className="space-y-2">
      {/* 标题和操作按钮 */}
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <CheckSquare className="w-4 h-4" />
          选择 9 个分镜 *
          <span className="text-sm font-normal text-muted-foreground">
            (已选 {selectedPanelIds.length}/9)
          </span>
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSelectFirst9}
            disabled={!canSelectFirst9}
          >
            选择前9个
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            disabled={!canClearSelection}
          >
            清空选择
          </Button>
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            加载分镜中...
          </span>
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && panels.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          该章节暂无分镜，请先生成分镜
        </div>
      )}

      {/* 分镜列表 */}
      {!isLoading && panels.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto border rounded-lg p-4">
            {panels.map((panel) => {
              const isSelected = selectedPanelIds.includes(panel.id);
              const selectionIndex = selectedPanelIds.indexOf(panel.id);

              return (
                <PanelCard
                  key={panel.id}
                  panel={panel}
                  isSelected={isSelected}
                  selectionIndex={selectionIndex}
                  isDisabled={!isSelected && selectedPanelIds.length >= 9}
                  onToggle={() => onPanelToggle(panel.id)}
                />
              );
            })}
          </div>

          {/* 提示信息 */}
          <p className="text-sm text-muted-foreground mt-2">
            点击分镜卡片进行选择，选中的分镜将按顺序排列在九宫格中
          </p>

          {/* 验证提示 */}
          {!isValidSelection && (
            <p className="text-sm text-destructive mt-1">
              请选择恰好 9 个分镜
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ==================== 子组件 ====================

interface PanelCardProps {
  panel: {
    id: string;
    panel_order: number;
    description: string;
    generated_image?: string;
  };
  isSelected: boolean;
  selectionIndex: number;
  isDisabled: boolean;
  onToggle: () => void;
}

/**
 * 单个分镜卡片
 */
function PanelCard({
  panel,
  isSelected,
  selectionIndex,
  isDisabled,
  onToggle,
}: PanelCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer",
        isSelected
          ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
          : "border-transparent bg-muted/30 hover:bg-muted/50"
      )}
      onClick={onToggle}
    >
      {/* 复选框 */}
      <Checkbox
        checked={isSelected}
        disabled={isDisabled}
        className="mt-1 pointer-events-none"
      />

      {/* 分镜图片 */}
      {panel.generated_image && (
        <img
          src={panel.generated_image}
          alt={`分镜 ${panel.panel_order}`}
          className="w-20 h-20 rounded object-cover"
        />
      )}

      {/* 分镜信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">分镜 {panel.panel_order}</span>
          {isSelected && (
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
}
