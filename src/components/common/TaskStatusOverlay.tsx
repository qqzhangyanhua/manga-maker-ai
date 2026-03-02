"use client";

import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TaskStatusOverlayProps {
  status: "pending" | "processing" | "completed" | "failed" | "idle";
  progress?: number;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function TaskStatusOverlay({
  status,
  progress,
  message,
  onRetry,
  className,
}: TaskStatusOverlayProps) {
  if (status === "idle" || status === "completed") return null;

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-10",
        className
      )}
    >
      {status === "pending" && (
        <>
          <div className="w-10 h-10 rounded-full border-2 border-zinc-600 border-t-orange-500 animate-spin mb-3" />
          <span className="text-sm text-zinc-300">{message || "排队中..."}</span>
        </>
      )}
      {status === "processing" && (
        <>
          <Loader2 className="w-10 h-10 text-orange-400 animate-spin mb-3" />
          {progress !== undefined && (
            <div className="w-32 mb-2">
              <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          <span className="text-sm text-zinc-300">
            {message || "生成中..."}
            {progress !== undefined && ` ${progress}%`}
          </span>
        </>
      )}
      {status === "failed" && (
        <>
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <span className="text-sm text-red-300 mb-3">
            {message || "生成失败"}
          </span>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="border-zinc-600 text-zinc-300 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              重试
            </Button>
          )}
        </>
      )}
    </div>
  );
}
