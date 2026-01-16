/**
 * PanelEstimationBadge - 镜头数量预估徽章组件
 *
 * 功能：
 * 1. 显示章节预估的镜头数量
 * 2. 显示预估的 credits 消耗
 * 3. 显示警告信息（如章节过长/过短）
 * 4. 支持不同的显示模式（紧凑/详细）
 */

import { Film, AlertCircle, Coins, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PanelEstimation } from "../types";
import { novelTheme } from "../../theme";
import { cn } from "@/lib/utils";

interface PanelEstimationBadgeProps {
  estimation: PanelEstimation | null;
  loading?: boolean;
  error?: string | null;
  mode?: "compact" | "detailed"; // 显示模式
  className?: string;
}

/**
 * 紧凑模式：仅显示镜头数和 credits
 */
function CompactMode({ estimation }: { estimation: PanelEstimation }) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* 镜头数徽章 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="flex items-center gap-1 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border-zinc-700">
              <Film className="h-3 w-3" />
              <span>{estimation.estimatedCount} 镜头</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
            <div className="text-xs space-y-1">
              <p>预估范围：{estimation.minCount} - {estimation.maxCount} 个</p>
              <p>章节字数：{estimation.wordCount} 字</p>
              <p>密度模式：{getDensityModeLabel(estimation.densityMode)}</p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Credits 徽章 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="flex items-center gap-1 border-zinc-700 text-zinc-300">
              <Coins className="h-3 w-3 text-purple-500" />
              <span>{estimation.estimatedCredits} Credits</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
            <p className="text-xs">预估消耗算力</p>
          </TooltipContent>
        </Tooltip>

        {/* 警告图标 */}
        {estimation.warnings.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="h-4 w-4 text-purple-500" />
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
              <div className="text-xs space-y-1">
                {estimation.warnings.map((warning, idx) => (
                  <p key={idx}>{warning}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * 详细模式：显示完整信息卡片
 */
function DetailedMode({ estimation }: { estimation: PanelEstimation }) {
  return (
    <div className={cn("space-y-3 p-4 border rounded-lg border-zinc-800 bg-zinc-900/50", novelTheme.card.base)}>
      {/* 标题 */}
      <div className="flex items-center gap-2 font-medium text-zinc-100">
        <Film className="h-5 w-5 text-purple-500" />
        <span>镜头数量预估</span>
      </div>

      {/* 核心数据 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-sm text-zinc-400">预估镜头数</div>
          <div className="text-2xl font-bold text-purple-500">
            {estimation.estimatedCount}
          </div>
          <div className="text-xs text-zinc-500">
            范围：{estimation.minCount} - {estimation.maxCount}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm text-zinc-400 flex items-center gap-1">
            <Coins className="h-3 w-3" />
            预估消耗
          </div>
          <div className="text-2xl font-bold text-purple-500">
            {estimation.estimatedCredits}
          </div>
          <div className="text-xs text-zinc-500">Credits</div>
        </div>
      </div>

      {/* 详细信息 */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800 text-sm">
        <div>
          <div className="text-zinc-500">章节字数</div>
          <div className="font-medium flex items-center gap-1 text-zinc-300">
            <FileText className="h-3 w-3" />
            {estimation.wordCount}
          </div>
        </div>
        <div>
          <div className="text-zinc-500">类型</div>
          <div className="font-medium text-zinc-300">{getGenreLabel(estimation.genre)}</div>
        </div>
        <div>
          <div className="text-zinc-500">密度</div>
          <div className="font-medium text-zinc-300">
            {getDensityModeLabel(estimation.densityMode)}
          </div>
        </div>
      </div>

      {/* 警告信息 */}
      {estimation.warnings.length > 0 && (
        <Alert variant="default" className="bg-purple-900/20 border-purple-500/30 text-purple-200">
          <AlertCircle className="h-4 w-4 text-purple-400" />
          <AlertDescription>
            <ul className="text-xs space-y-1 mt-1">
              {estimation.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * 主组件
 */
export function PanelEstimationBadge({
  estimation,
  loading = false,
  error = null,
  mode = "compact",
  className = "",
}: PanelEstimationBadgeProps) {
  // 加载状态
  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-6 w-24 bg-zinc-800 animate-pulse rounded"></div>
        <div className="h-6 w-20 bg-zinc-800 animate-pulse rounded"></div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Badge variant="destructive" className={cn("bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/30", className)}>
        <AlertCircle className="h-3 w-3 mr-1" />
        {error}
      </Badge>
    );
  }

  // 无数据
  if (!estimation) {
    return null;
  }

  // 根据模式渲染
  return (
    <div className={className}>
      {mode === "compact" ? (
        <CompactMode estimation={estimation} />
      ) : (
        <DetailedMode estimation={estimation} />
      )}
    </div>
  );
}

/**
 * 工具函数：获取类型标签
 */
function getGenreLabel(genre: string): string {
  const labels: Record<string, string> = {
    suspense: "悬疑",
    romance: "爱情",
    adventure: "冒险",
    scifi: "科幻",
    daily: "日常",
    fantasy: "奇幻",
  };
  return labels[genre] || genre;
}

/**
 * 工具函数：获取密度模式标签
 */
function getDensityModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    sparse: "稀疏",
    standard: "标准",
    dense: "密集",
  };
  return labels[mode] || mode;
}
