/**
 * 世界观条目卡片组件
 * 可复用的条目展示卡片，支持地点、人物、事件、物品、规则、伏笔等类型
 */
"use client";

import {
  MapPin,
  User,
  Calendar,
  Package,
  BookOpen,
  Eye,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  WorldEntry,
  EntryType,
  ENTRY_TYPE_CONFIG,
  FORESHADOW_STATUS_CONFIG,
  ForeshadowStatus,
} from "../../types/world";

/** 条目类型对应的图标映射 */
export const ENTRY_ICONS: Record<EntryType, React.ElementType> = {
  location: MapPin,
  character: User,
  event: Calendar,
  item: Package,
  rule: BookOpen,
  foreshadowing: Eye,
};

export interface EntryCardProps {
  /** 世界观条目数据 */
  entry: WorldEntry;
  /** 点击卡片回调 */
  onClick?: (entry: WorldEntry) => void;
  /** 是否显示箭头指示器 */
  showArrow?: boolean;
  /** 是否高亮显示（如过期伏笔） */
  highlighted?: boolean;
  /** 高亮样式类名 */
  highlightClassName?: string;
  /** 额外的类名 */
  className?: string;
}

/**
 * 世界观条目卡片
 * 展示条目的基本信息，包括类型图标、名称、描述、标签等
 */
export function EntryCard({
  entry,
  onClick,
  showArrow = true,
  highlighted = false,
  highlightClassName = "border-orange-500/50 bg-orange-50/50",
  className,
}: EntryCardProps) {
  const Icon = ENTRY_ICONS[entry.type];
  const config = ENTRY_TYPE_CONFIG[entry.type];
  const isForeshadowing = entry.type === "foreshadowing";

  const handleClick = () => {
    onClick?.(entry);
  };

  return (
    <div
      className={cn(
        "group p-4 rounded-lg border cursor-pointer transition-all",
        "bg-card/50 hover:bg-card/80 hover:shadow-md",
        "border-border/50 hover:border-primary/30",
        highlighted && highlightClassName,
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* 类型图标 */}
        <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
          <Icon className="h-4 w-4" />
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{entry.name}</h4>
            {isForeshadowing && entry.foreshadow_status && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs shrink-0",
                  FORESHADOW_STATUS_CONFIG[entry.foreshadow_status as ForeshadowStatus].color
                )}
              >
                {FORESHADOW_STATUS_CONFIG[entry.foreshadow_status as ForeshadowStatus].label}
              </Badge>
            )}
          </div>

          {/* 描述 */}
          {entry.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {entry.description}
            </p>
          )}

          {/* 标签 */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {entry.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{entry.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* 箭头指示器 */}
        {showArrow && (
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </div>
    </div>
  );
}

export interface EntryCardSkeletonProps {
  /** 额外的类名 */
  className?: string;
}

/**
 * 条目卡片骨架屏
 * 用于加载状态展示
 */
export function EntryCardSkeleton({ className }: EntryCardSkeletonProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg border bg-card/50 animate-pulse",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-2/3" />
          <div className="flex gap-1 mt-2">
            <div className="h-5 w-12 bg-muted rounded" />
            <div className="h-5 w-16 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
