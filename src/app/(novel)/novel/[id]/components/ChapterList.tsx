/**
 * 章节列表组件
 */
"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChapterOutline {
  chapterNumber: number;
  title: string;
  outline: string;
  keyEvents: string[];
  characters: string[];
  plotLines: string[];
  isKeyChapter: boolean;
  content?: string;
  wordCount?: number;
  status?: "draft" | "completed";
}

interface ChapterListProps {
  chapters: ChapterOutline[];
  selectedChapter: ChapterOutline | null;
  onSelect: (chapter: ChapterOutline) => void;
  loading: boolean;
}

export function ChapterList({
  chapters,
  selectedChapter,
  onSelect,
  loading,
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
        {chapters.map((chapter) => (
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
            <div className="text-xs text-muted-foreground">
              {chapter.wordCount ?? 0} 字
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
