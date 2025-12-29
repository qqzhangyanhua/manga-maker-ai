"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPaletteTriggerProps } from "./types";

export function CommandPaletteTrigger({ onClick }: CommandPaletteTriggerProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2",
        "bg-zinc-900/50 border border-zinc-800",
        "hover:border-zinc-700 hover:bg-zinc-900",
        "transition-colors group"
      )}
      onClick={onClick}
    >
      <Search className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400" />
      <span className="flex-1 text-left text-sm text-zinc-500 group-hover:text-zinc-400">
        搜索或输入命令...
      </span>
      <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-400">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
