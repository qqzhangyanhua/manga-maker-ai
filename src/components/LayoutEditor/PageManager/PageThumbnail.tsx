"use client";

/**
 * 页面缩略图组件
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Copy, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { ComicPageData } from "@/types/layout";

interface PageThumbnailProps {
  page: ComicPageData;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export const PageThumbnail = memo(function PageThumbnail({
  page,
  index,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  isDragging,
  dragHandleProps,
}: PageThumbnailProps) {
  // 计算缩略图的宽高比
  const aspectRatio = page.width / page.height;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "group relative flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer transition-all",
            isSelected
              ? "bg-primary/10 ring-2 ring-primary"
              : "hover:bg-muted/50",
            isDragging && "opacity-50"
          )}
          onClick={onSelect}
        >
          {/* 拖拽手柄 */}
          <div
            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
            {...dragHandleProps}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* 缩略图 */}
          <div
            className={cn(
              "relative bg-white border rounded shadow-sm overflow-hidden",
              "w-16"
            )}
            style={{
              aspectRatio: aspectRatio,
            }}
          >
            {page.thumbnailUrl ? (
              <img
                src={page.thumbnailUrl}
                alt={`第 ${index + 1} 页`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                空白
              </div>
            )}

            {/* 页码 */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
              {index + 1}
            </div>
          </div>

          {/* 操作按钮 - 悬停时显示 */}
          <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          复制页面
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          删除页面
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
