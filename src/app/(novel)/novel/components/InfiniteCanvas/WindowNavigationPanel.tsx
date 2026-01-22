"use client";

import { memo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WindowState } from "./types";

interface WindowNavigationPanelProps {
  window: WindowState;
  onPrev: () => void;
  onNext: () => void;
  onJumpFirst: () => void;
  onJumpLast: () => void;
  isLoading?: boolean;
}

export const WindowNavigationPanel = memo(function WindowNavigationPanel({
  window,
  onPrev,
  onNext,
  onJumpFirst,
  onJumpLast,
  isLoading = false,
}: WindowNavigationPanelProps) {
  const { start, end, total, hasMore } = window;

  if (total <= 5) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg px-3 py-2 shadow-xl">
      <Button
        variant="ghost"
        size="icon"
        onClick={onJumpFirst}
        disabled={!hasMore.prev || isLoading}
        className="h-8 w-8 text-zinc-400 hover:text-white disabled:opacity-30"
        title="跳转到第一章"
      >
        <ChevronsLeft className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        disabled={!hasMore.prev || isLoading}
        className="h-8 w-8 text-zinc-400 hover:text-white disabled:opacity-30"
        title="上一页"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1 px-2 min-w-[80px] justify-center">
        <span className="text-sm font-medium text-white">
          {start}-{end}
        </span>
        <span className="text-xs text-zinc-500">/</span>
        <span className="text-xs text-zinc-400">{total}</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={!hasMore.next || isLoading}
        className="h-8 w-8 text-zinc-400 hover:text-white disabled:opacity-30"
        title="下一页"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onJumpLast}
        disabled={!hasMore.next || isLoading}
        className="h-8 w-8 text-zinc-400 hover:text-white disabled:opacity-30"
        title="跳转到最后一章"
      >
        <ChevronsRight className="w-4 h-4" />
      </Button>
    </div>
  );
});
