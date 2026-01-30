/**
 * 方案生成中界面
 * 显示 loading 状态，等待 AI 生成 3 个方案
 */

import { Loader2 } from "lucide-react";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { WORKFLOW_PHASES, OptionsGeneratingProps } from "../types";

export function OptionsGenerating({ state }: OptionsGeneratingProps) {
  const { session, phaseResults } = state;

  // 当前正在生成的阶段是下一个未完成的阶段
  const currentPhaseIndex = phaseResults.length;
  const currentPhaseInfo = WORKFLOW_PHASES[currentPhaseIndex] || null;

  return (
    <div className="space-y-6">
      <ProgressIndicator state={state} />

      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-pulse" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-white">
            AI 正在为您生成方案...
          </h3>
          <p className="text-sm text-zinc-400">
            {currentPhaseInfo?.displayName}: {currentPhaseInfo?.description}
          </p>
          <p className="text-xs text-zinc-500 mt-4">
            正在生成 3 个不同方向的创意方案供您选择
          </p>
        </div>

        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-purple-500/50 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
