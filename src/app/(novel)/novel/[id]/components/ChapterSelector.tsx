/**
 * 章节选择器组件
 * 使用 Combobox 在版本管理页面选择章节
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { novelTheme } from "../../theme";

interface NovelChapter {
  id: string;
  chapter_number: number;
  title: string;
  word_count: number;
  status: string;
}

interface ChapterSelectorProps {
  projectId: string;
  value: string | null;
  onChange: (chapterId: string | null) => void;
}

export function ChapterSelector({
  projectId,
  value,
  onChange,
}: ChapterSelectorProps) {
  const [open, setOpen] = useState(false);

  // 获取章节列表
  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ["novel-chapters", projectId],
    queryFn: async (): Promise<NovelChapter[]> => {
      const response = await fetch(`/api/novel/chapters/project/${projectId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("获取章节列表失败");
      }

      return response.json();
    },
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
  });

  const selectedChapter = chapters.find((ch) => ch.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[300px] justify-between hover:bg-purple-500/10 focus:ring-purple-500/50", novelTheme.input.base)}
        >
          {selectedChapter ? (
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-zinc-400" />
              <span className="text-white">
                第 {selectedChapter.chapter_number} 章: {selectedChapter.title}
              </span>
            </span>
          ) : (
            <span className="text-zinc-500">选择章节...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl">
        <Command className="bg-transparent">
          <CommandInput
            placeholder="搜索章节..."
            className="h-9 text-white placeholder:text-zinc-500"
          />
          <CommandList>
            <CommandEmpty className="text-zinc-400 py-6 text-center text-sm">
              {isLoading ? "加载中..." : "未找到章节"}
            </CommandEmpty>
            <CommandGroup>
              {chapters.map((chapter) => (
                <CommandItem
                  key={chapter.id}
                  value={chapter.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? null : currentValue);
                    setOpen(false);
                  }}
                  className="text-white hover:bg-purple-500/20 cursor-pointer aria-selected:bg-purple-500/20"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === chapter.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        第 {chapter.chapter_number} 章
                      </span>
                      <span className="text-xs text-zinc-500">
                        {chapter.word_count} 字
                      </span>
                    </div>
                    <span className="text-sm text-zinc-400 truncate">
                      {chapter.title}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
