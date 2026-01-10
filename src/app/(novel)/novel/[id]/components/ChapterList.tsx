/**
 * 章节列表组件
 */
"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Film } from "lucide-react";
import { estimatePanelCountFromOutline } from "../utils/panelEstimator";
import type { ChapterOutline } from "../types";

interface ChapterListProps {
  chapters: ChapterOutline[];
  selectedChapter: ChapterOutline | null;
  onSelect: (chapter: ChapterOutline) => void;
  loading: boolean;
  genre?: string; // 故事类型，用于计算预估
}

export function ChapterList({
  chapters,
  selectedChapter,
  onSelect,
  loading,
  genre = "default",
}: ChapterListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={`skeleton-${i}`} className="h-16 bg-gray-100 rounded animate-pulse" />
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

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="p-2 space-y-2">
        {chapters.map((chapter) => {
          // 计算镜头预估
          const estimation = estimatePanelCountFromOutline(chapter, genre, "standard");

          return (
            <button
              key={chapter._tempId || `chapter-${chapter.chapterNumber}`}
              onClick={() => onSelect(chapter)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-all",
                "border-2",
                selectedChapter?.chapterNumber === chapter.chapterNumber
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "bg-background border-transparent hover:border-muted-foreground/20 hover:bg-accent/50"
              )}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-medium text-sm line-clamp-1">
                  {chapter.title}
                </span>
                <Badge
                  variant={selectedChapter?.chapterNumber === chapter.chapterNumber ? "default" : "outline"}
                  className="text-xs ml-2"
                >
                  {chapter.chapterNumber}
                </Badge>
              </div>

              {/* 字数和镜头预估 */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
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
