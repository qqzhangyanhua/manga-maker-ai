/**
 * 可勾选的分镜卡片组件
 *
 * 在多选模式下包装 EditablePanelCard，添加勾选框和选中样式
 */

"use client";

import { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface SelectablePanelWrapperProps {
  /** 分镜ID */
  panelId: string;
  /** 分镜序号 */
  panelOrder: number;
  /** 是否处于多选模式 */
  isSelectionMode: boolean;
  /** 是否被选中（多选） */
  isBatchSelected: boolean;
  /** 切换选中状态 */
  onToggleSelection: (id: string) => void;
  /** Shift+点击范围选择 */
  onShiftClick?: (id: string) => void;
  /** 子组件 */
  children: React.ReactNode;
}

export default function SelectablePanelWrapper({
  panelId,
  panelOrder,
  isSelectionMode,
  isBatchSelected,
  onToggleSelection,
  onShiftClick,
  children,
}: SelectablePanelWrapperProps) {
  // 处理勾选框点击
  const handleCheckboxClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey && onShiftClick) {
      onShiftClick(panelId);
    } else {
      onToggleSelection(panelId);
    }
  };

  // 处理卡片点击（多选模式下直接切换选中）
  const handleCardClick = (e: MouseEvent) => {
    if (!isSelectionMode) return;

    e.stopPropagation();
    if (e.shiftKey && onShiftClick) {
      onShiftClick(panelId);
    } else {
      onToggleSelection(panelId);
    }
  };

  if (!isSelectionMode) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "relative group transition-all duration-150",
        isBatchSelected && "ring-2 ring-primary ring-offset-2 rounded-lg"
      )}
      onClick={handleCardClick}
    >
      {/* 勾选框 */}
      <div
        className={cn(
          "absolute -left-2 top-4 z-10",
          "flex items-center justify-center",
          "w-8 h-8 rounded-full",
          "bg-background border-2 border-border shadow-md",
          "cursor-pointer transition-all duration-150",
          "hover:border-primary hover:scale-110",
          isBatchSelected && "border-primary bg-primary"
        )}
        onClick={handleCheckboxClick}
      >
        <Checkbox
          checked={isBatchSelected}
          onCheckedChange={() => onToggleSelection(panelId)}
          className={cn(
            "w-4 h-4",
            isBatchSelected && "data-[state=checked]:bg-transparent data-[state=checked]:text-primary-foreground"
          )}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* 序号徽章（多选模式下更醒目） */}
      {isBatchSelected && (
        <div
          className={cn(
            "absolute -right-2 -top-2 z-10",
            "flex items-center justify-center",
            "w-6 h-6 rounded-full",
            "bg-primary text-primary-foreground",
            "text-xs font-bold shadow-md"
          )}
        >
          {panelOrder}
        </div>
      )}

      {/* 选中遮罩 */}
      {isBatchSelected && (
        <div
          className={cn(
            "absolute inset-0 z-0",
            "bg-primary/5 rounded-lg pointer-events-none"
          )}
        />
      )}

      {/* 原始卡片内容 */}
      <div className={cn(isSelectionMode && "pointer-events-none")}>
        {children}
      </div>

      {/* 点击热区覆盖层（多选模式下捕获点击） */}
      {isSelectionMode && (
        <div
          className="absolute inset-0 z-[5] cursor-pointer"
          onClick={handleCardClick}
        />
      )}
    </div>
  );
}
