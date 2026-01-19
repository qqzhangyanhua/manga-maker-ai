/**
 * 伏笔卡片组件
 * 专门用于展示伏笔条目，包含章节信息、过期警告和状态更新功能
 */
"use client";

import { Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WorldEntry } from "../../types/world";

export interface ForeshadowCardProps {
  /** 伏笔条目数据 */
  entry: WorldEntry;
  /** 当前章节号，用于判断是否过期 */
  currentChapter: number;
  /** 点击更新状态按钮回调 */
  onUpdateStatus?: (entry: WorldEntry) => void;
  /** 额外的类名 */
  className?: string;
}

/**
 * 伏笔卡片
 * 展示伏笔的详细信息，包括埋设章节、计划揭示章节、实际揭示章节等
 */
export function ForeshadowCard({
  entry,
  currentChapter,
  onUpdateStatus,
  className,
}: ForeshadowCardProps) {
  const isOverdue =
    entry.planned_reveal_chapter &&
    entry.planned_reveal_chapter <= currentChapter &&
    entry.foreshadow_status !== "revealed";

  const handleUpdateClick = () => {
    onUpdateStatus?.(entry);
  };

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all",
        "bg-card/50 hover:bg-card/80",
        isOverdue && "border-orange-500/50 bg-orange-50/50",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
            <h4 className="font-medium truncate">{entry.name}</h4>
            {isOverdue && (
              <Badge variant="outline" className="text-orange-600 border-orange-300 shrink-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                已过期
              </Badge>
            )}
          </div>

          {/* 描述 */}
          {entry.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {entry.description}
            </p>
          )}

          {/* 章节信息 */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            {entry.planted_chapter && (
              <span>埋设：第 {entry.planted_chapter} 章</span>
            )}
            {entry.planned_reveal_chapter && (
              <span>计划揭示：第 {entry.planned_reveal_chapter} 章</span>
            )}
            {entry.actual_reveal_chapter && (
              <span className="text-green-600">
                已揭示：第 {entry.actual_reveal_chapter} 章
              </span>
            )}
          </div>

          {/* 提示文本 */}
          {entry.hint_text && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              提示：{entry.hint_text}
            </p>
          )}
        </div>

        {/* 更新按钮 */}
        {onUpdateStatus && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateClick}
            className="shrink-0"
          >
            更新状态
          </Button>
        )}
      </div>
    </div>
  );
}

export interface ForeshadowCardSkeletonProps {
  /** 额外的类名 */
  className?: string;
}

/**
 * 伏笔卡片骨架屏
 */
export function ForeshadowCardSkeleton({ className }: ForeshadowCardSkeletonProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border bg-card/50 animate-pulse",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted" />
            <div className="h-5 bg-muted rounded w-1/3" />
          </div>
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="flex gap-4">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        </div>
        <div className="h-8 w-20 bg-muted rounded" />
      </div>
    </div>
  );
}
