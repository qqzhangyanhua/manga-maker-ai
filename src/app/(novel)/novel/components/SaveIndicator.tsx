/**
 * 自动保存状态指示器
 */
"use client";

import { Check, Loader2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date | null;
  errorMessage?: string;
  className?: string;
}

export function SaveIndicator({
  status,
  lastSaved,
  errorMessage,
  className,
}: SaveIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "saving":
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: "保存中...",
          color: "text-blue-600",
        };
      case "saved":
        return {
          icon: <Check className="h-3 w-3" />,
          text: lastSaved ? `已保存于 ${formatTime(lastSaved)}` : "已保存",
          color: "text-green-600",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: errorMessage || "保存失败",
          color: "text-red-600",
        };
      default:
        return {
          icon: <Clock className="h-3 w-3" />,
          text: "未保存",
          color: "text-gray-400",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium transition-colors",
        config.color,
        className
      )}
      title={config.text}
    >
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
