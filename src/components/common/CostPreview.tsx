"use client";

import { Coins, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CostPreviewProps {
  estimatedCost: number;
  currentBalance: number;
  itemCount?: number;
  itemLabel?: string;
  className?: string;
}

export function CostPreview({
  estimatedCost,
  currentBalance,
  itemCount,
  itemLabel = "张图片",
  className,
}: CostPreviewProps) {
  const isInsufficient = currentBalance < estimatedCost;
  const remainingAfter = currentBalance - estimatedCost;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        isInsufficient
          ? "border-red-500/30 bg-red-500/5"
          : "border-zinc-700 bg-zinc-800/50",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-zinc-400 flex items-center gap-1.5">
          <Coins className="w-4 h-4" />
          预估费用
        </span>
        <span
          className={cn(
            "font-semibold",
            isInsufficient ? "text-red-400" : "text-orange-400"
          )}
        >
          {estimatedCost} 算力
        </span>
      </div>

      {itemCount !== undefined && (
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
          <span>
            {itemCount} {itemLabel}
          </span>
          <span>
            {Math.ceil(estimatedCost / Math.max(itemCount, 1))} 算力/张
          </span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-700/50">
        <span className="text-zinc-500">当前余额</span>
        <span className="text-zinc-300">{currentBalance} 算力</span>
      </div>

      {!isInsufficient && (
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-zinc-500">生成后余额</span>
          <span className="text-zinc-300">{remainingAfter} 算力</span>
        </div>
      )}

      {isInsufficient && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>算力不足，还需 {estimatedCost - currentBalance} 算力</span>
        </div>
      )}
    </div>
  );
}
