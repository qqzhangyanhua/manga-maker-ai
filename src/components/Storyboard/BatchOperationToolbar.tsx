/**
 * 批量操作工具栏组件
 *
 * 功能：
 * - 显示选中状态（已选 X/Y 格）
 * - 提供全选/取消选择操作
 * - 提供批量操作入口（角色/风格/生成/删除）
 * - 退出多选模式
 */

"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  Square,
  X,
  Users,
  Palette,
  Camera,
  Sparkles,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { BatchOperationLoadingState } from "@/types/batch-selection";

interface BatchOperationToolbarProps {
  /** 已选中的数量 */
  selectedCount: number;
  /** 总数量 */
  totalCount: number;
  /** 是否正在加载 */
  operationLoading?: BatchOperationLoadingState;
  /** 全选回调 */
  onSelectAll: () => void;
  /** 清空选择回调 */
  onClearSelection: () => void;
  /** 退出多选模式回调 */
  onExitSelectionMode: () => void;
  /** 批量角色替换回调 */
  onBatchCharacter?: () => void;
  /** 批量风格调整回调 */
  onBatchStyle?: () => void;
  /** 批量镜头调整回调 */
  onBatchCamera?: () => void;
  /** 批量生成回调 */
  onBatchGenerate?: () => void;
  /** 批量删除回调 */
  onBatchDelete?: () => void;
}

export default function BatchOperationToolbar({
  selectedCount,
  totalCount,
  operationLoading,
  onSelectAll,
  onClearSelection,
  onExitSelectionMode,
  onBatchCharacter,
  onBatchStyle,
  onBatchCamera,
  onBatchGenerate,
  onBatchDelete,
}: BatchOperationToolbarProps) {
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const hasSelection = selectedCount > 0;
  const isLoading = operationLoading?.isLoading;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border",
        "animate-in slide-in-from-top-2 duration-200"
      )}
    >
      {/* 左侧：选择状态 */}
      <div className="flex items-center gap-3">
        {/* 全选/取消按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={isAllSelected ? onClearSelection : onSelectAll}
          disabled={isLoading}
        >
          {isAllSelected ? (
            <CheckSquare className="w-4 h-4 mr-1.5 text-primary" />
          ) : (
            <Square className="w-4 h-4 mr-1.5" />
          )}
          {isAllSelected ? "取消全选" : "全选"}
        </Button>

        {/* 选中计数 */}
        <div className="text-sm text-muted-foreground">
          已选{" "}
          <span className="font-medium text-foreground">{selectedCount}</span>
          /{totalCount} 格
        </div>

        {/* 加载进度 */}
        {operationLoading?.progress && (
          <div className="text-xs text-muted-foreground">
            处理中: {operationLoading.progress.current}/
            {operationLoading.progress.total}
          </div>
        )}
      </div>

      {/* 中间：批量操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 批量角色 */}
        {onBatchCharacter && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onBatchCharacter}
            disabled={!hasSelection || isLoading}
          >
            <Users className="w-4 h-4 mr-1.5" />
            批量角色
          </Button>
        )}

        {/* 批量风格 */}
        {onBatchStyle && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onBatchStyle}
            disabled={!hasSelection || isLoading}
          >
            <Palette className="w-4 h-4 mr-1.5" />
            批量风格
          </Button>
        )}

        {/* 批量镜头 */}
        {onBatchCamera && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onBatchCamera}
            disabled={!hasSelection || isLoading}
          >
            <Camera className="w-4 h-4 mr-1.5" />
            批量镜头
          </Button>
        )}

        {/* 批量生成 */}
        {onBatchGenerate && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onBatchGenerate}
            disabled={!hasSelection || isLoading}
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            批量生成
          </Button>
        )}

        {/* 更多操作下拉 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              disabled={!hasSelection || isLoading}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onBatchCharacter}
              disabled={!hasSelection}
            >
              <Users className="w-4 h-4 mr-2" />
              批量替换角色
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onBatchStyle} disabled={!hasSelection}>
              <Palette className="w-4 h-4 mr-2" />
              批量调整风格
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onBatchCamera} disabled={!hasSelection}>
              <Camera className="w-4 h-4 mr-2" />
              批量调整镜头
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onBatchGenerate}
              disabled={!hasSelection}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              批量重新生成
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onBatchDelete}
              disabled={!hasSelection}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              批量删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 右侧：退出按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={onExitSelectionMode}
        disabled={isLoading}
      >
        <X className="w-4 h-4 mr-1.5" />
        退出多选
      </Button>
    </div>
  );
}
