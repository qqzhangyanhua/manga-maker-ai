import { cn } from "@/lib/utils";
import { ProgressIndicatorProps } from "./types";
import { Clock } from "lucide-react";

export function ProgressIndicator({
  completionRate,
  totalChapters,
  completedChapters,
  totalPanels,
  completedPanels,
  stageLabel,
  estimatedMinutes,
  className,
}: ProgressIndicatorProps) {
  const hasProgress = totalPanels > 0;

  return (
    <div
      className={cn(
        "bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-4",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        {/* Stage label */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-300">{stageLabel}</span>
        </div>

        {/* Completion rate */}
        {hasProgress && (
          <span className="text-sm font-semibold text-orange-400">
            {completionRate}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {hasProgress && (
        <div className="w-full bg-gray-800 rounded-full h-2 mb-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500 ease-out"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>
            章节: <span className="text-white font-medium">{completedChapters}</span>/
            {totalChapters}
          </span>
          {hasProgress && (
            <span>
              分镜: <span className="text-white font-medium">{completedPanels}</span>/
              {totalPanels}
            </span>
          )}
        </div>

        {/* Estimated time */}
        {estimatedMinutes !== undefined && estimatedMinutes > 0 && (
          <div className="flex items-center gap-1 text-orange-400">
            <Clock className="w-3 h-3" />
            <span>预计 {estimatedMinutes} 分钟</span>
          </div>
        )}
      </div>
    </div>
  );
}
