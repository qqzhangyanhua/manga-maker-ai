"use client";

import { Loader2, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TaskStatusInlineProps {
  status: "pending" | "processing" | "completed" | "failed" | "idle";
  progress?: number;
  message?: string;
  className?: string;
}

export function TaskStatusInline({
  status,
  progress,
  message,
  className,
}: TaskStatusInlineProps) {
  if (status === "idle") return null;

  return (
    <div className={cn("inline-flex items-center gap-2 text-sm", className)}>
      {status === "pending" && (
        <>
          <Clock className="w-4 h-4 text-zinc-400 animate-pulse" />
          <span className="text-zinc-400">{message || "排队中..."}</span>
        </>
      )}
      {status === "processing" && (
        <>
          <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
          <span className="text-orange-400">
            {message || "处理中..."}
            {progress !== undefined && ` ${progress}%`}
          </span>
        </>
      )}
      {status === "completed" && (
        <>
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-green-400">{message || "完成"}</span>
        </>
      )}
      {status === "failed" && (
        <>
          <X className="w-4 h-4 text-red-400" />
          <span className="text-red-400">{message || "失败"}</span>
        </>
      )}
    </div>
  );
}
