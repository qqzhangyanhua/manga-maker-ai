"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  /** Lucide 图标组件或自定义 ReactNode（向后兼容） */
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  /** 新 API：按钮文案 */
  actionLabel?: string;
  /** 新 API：按钮点击回调 */
  onAction?: () => void;
  /** 旧 API：自定义操作区域 */
  action?: ReactNode;
  /** 旧 API：紧凑模式 */
  variant?: "default" | "compact";
  className?: string;
}

export function EmptyState({
  icon: IconOrNode = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const isCompact = variant === "compact";
  const isLucideIcon = typeof IconOrNode === "function";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isCompact ? "py-8 px-4" : "py-12 px-4",
        className
      )}
    >
      <div
        className={cn(
          "rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4 text-zinc-500",
          isCompact ? "w-12 h-12" : "w-14 h-14"
        )}
      >
        {isLucideIcon ? (
          <IconOrNode
            className={cn("text-zinc-500", isCompact ? "w-6 h-6" : "w-7 h-7")}
          />
        ) : (
          IconOrNode
        )}
      </div>
      <h3
        className={cn(
          "font-medium text-zinc-300 mb-1",
          isCompact ? "text-base" : "text-lg"
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "text-zinc-500 mb-6",
            isCompact ? "text-sm max-w-sm" : "text-sm max-w-sm"
          )}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {actionLabel}
        </Button>
      )}
      {action && !(actionLabel && onAction) && <div className="mt-2">{action}</div>}
    </div>
  );
}
