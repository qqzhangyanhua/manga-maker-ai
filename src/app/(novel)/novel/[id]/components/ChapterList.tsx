/**
 * 章节列表组件
 */
"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  word_count: number;
  status: string;
}

interface ChapterListProps {
  chapters: Chapter[];
  selectedChapter: Chapter | null;
  onSelect: (chapter: Chapter) => void;
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
          <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
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
      <div className="p-2 space-y-1">
        {chapters.map((chapter) => (
          <button
            key={chapter.id}
            onClick={() => onSelect(chapter)}
            className={cn(
              "w-full text-left p-3 rounded-lg transition-colors",
              "hover:bg-accent",
              selectedChapter?.id === chapter.id && "bg-accent"
            )}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="font-medium text-sm line-clamp-1">
                {chapter.title}
              </span>
              <Badge variant="outline" className="text-xs ml-2">
                {chapter.chapter_number}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {chapter.word_count} 字
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
