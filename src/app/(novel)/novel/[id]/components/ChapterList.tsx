/**
 * 章节列表组件
 *
 * 支持两种模式：
 * 1. 普通模式：点击选中单个章节进行编辑
 * 2. 选择模式：显示复选框，支持多选批量操作
 */
"use client";

import { cn } from "@/lib/utils";
import { novelTheme } from "../../theme";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Film } from "lucide-react";
import { estimatePanelCountFromOutline } from "../utils/panelEstimator";
import type { ChapterOutline } from "../types";
import type { MouseEvent } from "react";

interface ChapterListProps {
  chapters: ChapterOutline[];
  selectedChapter: ChapterOutline | null;
  onSelect: (chapter: ChapterOutline) => void;
  loading: boolean;
  genre?: string;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (chapterId: string, event?: MouseEvent) => void;
}

export function ChapterList({
  chapters,
  selectedChapter,
  onSelect,
  loading,
  genre = "default",
  selectionMode = false,
  selectedIds,
  onToggleSelection,
}: ChapterListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={`skeleton-${i}`} className="h-16 bg-zinc-800/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        暂无章节
      </div>
    );
  }

  const handleItemClick = (chapter: ChapterOutline, event: MouseEvent) => {
    if (selectionMode && chapter.id && onToggleSelection) {
      onToggleSelection(chapter.id, event);
    } else {
      onSelect(chapter);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="p-2 space-y-2">
        {chapters.map((chapter) => {
          const estimation = estimatePanelCountFromOutline(chapter, genre, "standard");
          const isChecked = chapter.id ? selectedIds?.has(chapter.id) : false;
          const isEditingSelected = selectedChapter?.chapterNumber === chapter.chapterNumber;

          return (
            <button
              key={chapter._tempId || `chapter-${chapter.chapterNumber}`}
              onClick={(e) => handleItemClick(chapter, e)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-all",
                "border-2",
                selectionMode && isChecked
                  ? "bg-purple-500/20 border-purple-500 shadow-sm shadow-purple-500/10"
                  : isEditingSelected && !selectionMode
                    ? "bg-purple-500/20 border-purple-500 shadow-sm shadow-purple-500/10"
                    : cn(novelTheme.card.base, "hover:border-purple-500/30 hover:bg-purple-500/5")
              )}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {selectionMode && chapter.id && (
                    <Checkbox
                      checked={isChecked}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => {
                        if (chapter.id && onToggleSelection) {
                          onToggleSelection(chapter.id);
                        }
                      }}
                      className="border-purple-500/50 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                  )}
                  <span className="font-medium text-sm line-clamp-1">
                    {chapter.title}
                  </span>
                </div>
                <Badge
                  variant={isEditingSelected && !selectionMode ? "default" : "outline"}
                  className={cn(
                    "text-xs ml-2",
                    isEditingSelected && !selectionMode
                      ? novelTheme.button.primary
                      : "text-muted-foreground"
                  )}
                >
                  {chapter.chapterNumber}
                </Badge>
              </div>

              {/* 字数和镜头预估 */}
              <div className={cn(
                "flex items-center gap-3 text-xs text-muted-foreground mt-2",
                selectionMode && "ml-6"
              )}>
                <span>{chapter.wordCount ?? estimation.wordCount} 字</span>
                <div className="flex items-center gap-1">
                  <Film className="h-3 w-3" />
                  <span>~{estimation.estimatedCount} 镜</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
