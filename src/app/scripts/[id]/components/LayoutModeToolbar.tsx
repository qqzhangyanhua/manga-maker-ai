/**
 * 布局模式工具栏组件
 * 用于选择Panel并应用布局（2镜/3镜/4镜/6镜）
 */

"use client";

import { useMemo } from "react";
import {
  LayoutGrid,
  Grid2X2,
  Grid3X3,
  Columns2,
  Rows2,
  Columns3,
  Rows3,
  Ungroup,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Panel } from "../types/script-editor.types";
import type { LayoutSize, LayoutDirection } from "../types/layout.types";
import { isSelectionContinuous, isInLayoutGroup } from "../types/layout.types";

interface LayoutModeToolbarProps {
  isLayoutMode: boolean;
  selectedPanelIds: string[];
  panels: Panel[];
  isApplying: boolean;
  onEnterLayoutMode: () => void;
  onExitLayoutMode: () => void;
  onApplyLayout: (layoutType: LayoutSize, direction?: LayoutDirection) => void;
  onClearSelection: () => void;
}

export function LayoutModeToolbar({
  isLayoutMode,
  selectedPanelIds,
  panels,
  isApplying,
  onEnterLayoutMode,
  onExitLayoutMode,
  onApplyLayout,
  onClearSelection,
}: LayoutModeToolbarProps) {
  const selectionCount = selectedPanelIds.length;

  // 检查选择是否有效（连续）
  const isContinuous = useMemo(
    () => isSelectionContinuous(selectedPanelIds, panels),
    [selectedPanelIds, panels]
  );

  // 检查选择中是否包含已在布局组内的Panel
  const hasGroupedPanels = useMemo(() => {
    return selectedPanelIds.some((id) => {
      const panel = panels.find((p) => p.id === id);
      return panel && isInLayoutGroup(panel);
    });
  }, [selectedPanelIds, panels]);

  // 计算各布局类型是否可用
  const canApply2 = selectionCount === 2 && isContinuous && !hasGroupedPanels;
  const canApply3 = selectionCount === 3 && isContinuous && !hasGroupedPanels;
  const canApply4 = selectionCount === 4 && isContinuous && !hasGroupedPanels;
  const canApply6 = selectionCount === 6 && isContinuous && !hasGroupedPanels;

  // 生成提示信息
  const getTooltipMessage = (requiredCount: number): string => {
    if (selectionCount !== requiredCount) {
      return `需要选择 ${requiredCount} 个分镜（当前 ${selectionCount} 个）`;
    }
    if (!isContinuous) {
      return "请选择连续的分镜";
    }
    if (hasGroupedPanels) {
      return "选择中包含已组合的分镜，请先拆分";
    }
    return `创建 ${requiredCount}镜 布局`;
  };

  // 非布局模式：显示"布局编辑"按钮
  if (!isLayoutMode) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onEnterLayoutMode}
            disabled={panels.length < 2}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            布局编辑
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          选择多个分镜组合为 2镜/3镜/4镜/6镜 布局
        </TooltipContent>
      </Tooltip>
    );
  }

  // 布局模式：显示完整工具栏
  return (
    <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg flex-wrap">
      {/* 选择状态 */}
      <div className="flex items-center gap-2 mr-2">
        <Badge variant={selectionCount > 0 ? "default" : "secondary"}>
          已选 {selectionCount} 个
        </Badge>
        {selectionCount > 0 && !isContinuous && (
          <Badge variant="destructive" className="text-xs">
            不连续
          </Badge>
        )}
        {selectionCount > 0 && hasGroupedPanels && (
          <Badge variant="destructive" className="text-xs">
            含已组合
          </Badge>
        )}
        {/* 快捷键提示 */}
        {selectionCount === 0 && (
          <span className="text-xs text-muted-foreground">
            点击选择 | Shift连选 | Ctrl/Cmd多选
          </span>
        )}
      </div>

      {/* 分隔线 */}
      <div className="h-6 w-px bg-border" />

      {/* 2镜布局（带方向选择） */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={canApply2 ? "default" : "outline"}
                size="sm"
                disabled={!canApply2 || isApplying}
              >
                <Grid2X2 className="w-4 h-4 mr-1" />
                2镜
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{getTooltipMessage(2)}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onApplyLayout("2", "h")}>
            <Columns2 className="w-4 h-4 mr-2" />
            横排 (左右)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onApplyLayout("2", "v")}>
            <Rows2 className="w-4 h-4 mr-2" />
            竖排 (上下)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 3镜布局（带方向选择） */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={canApply3 ? "default" : "outline"}
                size="sm"
                disabled={!canApply3 || isApplying}
              >
                <Columns3 className="w-4 h-4 mr-1" />
                3镜
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{getTooltipMessage(3)}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onApplyLayout("3", "h")}>
            <Columns3 className="w-4 h-4 mr-2" />
            横排 (三列)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onApplyLayout("3", "v")}>
            <Rows3 className="w-4 h-4 mr-2" />
            竖排 (三行)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 4镜布局 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={canApply4 ? "default" : "outline"}
            size="sm"
            onClick={() => onApplyLayout("4")}
            disabled={!canApply4 || isApplying}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            4镜
          </Button>
        </TooltipTrigger>
        <TooltipContent>{getTooltipMessage(4)}</TooltipContent>
      </Tooltip>

      {/* 6镜布局 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={canApply6 ? "default" : "outline"}
            size="sm"
            onClick={() => onApplyLayout("6")}
            disabled={!canApply6 || isApplying}
          >
            <Grid3X3 className="w-4 h-4 mr-1" />
            6镜
          </Button>
        </TooltipTrigger>
        <TooltipContent>{getTooltipMessage(6)}</TooltipContent>
      </Tooltip>

      {/* 分隔线 */}
      <div className="h-6 w-px bg-border" />

      {/* 清空选择 */}
      {selectionCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={isApplying}
            >
              <Ungroup className="w-4 h-4 mr-1" />
              清空
            </Button>
          </TooltipTrigger>
          <TooltipContent>取消所有选择</TooltipContent>
        </Tooltip>
      )}

      {/* 退出布局模式 */}
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExitLayoutMode}
          disabled={isApplying}
        >
          <X className="w-4 h-4 mr-1" />
          取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onExitLayoutMode}
          disabled={isApplying}
        >
          <Check className="w-4 h-4 mr-1" />
          完成
        </Button>
      </div>
    </div>
  );
}
