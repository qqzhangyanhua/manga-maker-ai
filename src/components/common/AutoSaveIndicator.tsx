"use client";

import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export function AutoSaveIndicator({ status, className }: AutoSaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      {status === "unsaved" && (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          <span className="text-yellow-400">未保存</span>
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />
          <span className="text-zinc-400">保存中...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="w-3 h-3 text-green-400" />
          <span className="text-green-400">已保存</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="w-3 h-3 text-red-400" />
          <span className="text-red-400">保存失败</span>
        </>
      )}
    </div>
  );
}
