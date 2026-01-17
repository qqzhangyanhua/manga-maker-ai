"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ChapterSummary, WindowState, GenerationStatus } from "./types";

interface ChapterNavigatorProps {
  summaries: ChapterSummary[];
  window: WindowState;
  onNavigate: (chapterNumber: number) => void;
}

function getChapterStatusColor(summary: ChapterSummary): string {
  const statuses: GenerationStatus[] = [
    summary.script_status,
    summary.shot_status,
    summary.scene_status,
    summary.final_status,
  ];

  if (statuses.every((s) => s === "completed")) {
    return "bg-green-500";
  }
  if (statuses.some((s) => s === "generating")) {
    return "bg-purple-500 animate-pulse";
  }
  if (statuses.some((s) => s === "error")) {
    return "bg-red-500";
  }
  if (statuses.some((s) => s === "completed")) {
    return "bg-yellow-500";
  }
  return "bg-zinc-600";
}

export const ChapterNavigator = memo(function ChapterNavigator({
  summaries,
  window,
  onNavigate,
}: ChapterNavigatorProps) {
  const visibleRange = useMemo(() => {
    return {
      start: window.start,
      end: window.end,
    };
  }, [window.start, window.end]);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>章节导航</span>
        <span>
          {window.start}-{window.end} / {window.total}
        </span>
      </div>

      <div className="flex gap-1 flex-wrap max-w-[280px]">
        {summaries.map((summary) => {
          const isInWindow =
            summary.chapter_number >= visibleRange.start &&
            summary.chapter_number <= visibleRange.end;
          const isCenter = summary.chapter_number === window.center;

          return (
            <button
              key={summary.id}
              onClick={() => onNavigate(summary.chapter_number)}
              className={cn(
                "w-6 h-6 rounded text-[10px] font-medium transition-all",
                "hover:scale-110 hover:ring-2 hover:ring-purple-400",
                getChapterStatusColor(summary),
                isInWindow && "ring-2 ring-white/50",
                isCenter && "ring-2 ring-purple-500 scale-110"
              )}
              title={`第 ${summary.chapter_number} 章`}
            >
              {summary.chapter_number}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>完成</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span>生成中</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>部分</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-zinc-600" />
          <span>待处理</span>
        </div>
      </div>
    </div>
  );
});
