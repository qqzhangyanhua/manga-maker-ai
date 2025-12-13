"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrialState } from "./types";

interface TrialProgressProps {
  state: TrialState;
}

const TIPS = [
  "AI 正在分析你的故事，设计角色和场景...",
  "漫画的关键是讲好故事，而不是完美的画功",
  "好的分镜就像电影镜头，能让读者身临其境",
  "每一格漫画都是一个小故事",
];

export function TrialProgress({ state }: TrialProgressProps) {
  const tipIndex = Math.floor((state.progress / 100) * TIPS.length);
  const currentTip = TIPS[Math.min(tipIndex, TIPS.length - 1)];

  return (
    <div className="py-8 space-y-8">
      {/* 动画图标 */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          {/* 外圈进度 */}
          <svg
            className="absolute inset-0 w-20 h-20 -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-primary"
              strokeLinecap="round"
              strokeDasharray={`${state.progress * 2.89} 289`}
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
          </svg>
        </div>
      </div>

      {/* 进度文字 */}
      <div className="text-center space-y-2">
        <h3 className="font-comic text-xl text-foreground">
          正在创作中...
        </h3>
        <p className="text-muted-foreground">{state.progressText}</p>
      </div>

      {/* 进度条 */}
      <div className="space-y-2">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full bg-gradient-to-r from-primary to-secondary rounded-full",
              "transition-all duration-500 ease-out"
            )}
            style={{ width: `${state.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>生成中</span>
          <span>{state.progress}%</span>
        </div>
      </div>

      {/* 小贴士 */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground text-center">
          {currentTip}
        </p>
      </div>
    </div>
  );
}
