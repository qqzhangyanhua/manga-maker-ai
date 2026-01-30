/**
 * 进度指示器组件
 * 显示四阶段工作流进度
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_PHASES, StageProps } from "../types";

export function ProgressIndicator({ state }: Pick<StageProps, "state">) {
  const { phaseResults } = state;
  
  // 使用 phaseResults 长度判断当前进度
  const currentPhaseIndex = phaseResults.length;
  const completedPhases = phaseResults.map((r) => r.phase);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {WORKFLOW_PHASES.map((phase, index) => {
        const isCompleted = completedPhases.includes(phase.phase);
        const isCurrent = index === currentPhaseIndex;
        const PhaseIcon = phase.icon;

        return (
          <div key={phase.phase} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                isCompleted && "bg-green-500/20 text-green-400",
                isCurrent && !isCompleted && "bg-purple-500/20 text-purple-400",
                !isCompleted && !isCurrent && "bg-zinc-800 text-zinc-500"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center",
                  isCompleted && "bg-green-500/30",
                  isCurrent && !isCompleted && "bg-purple-500/30",
                  !isCompleted && !isCurrent && "bg-zinc-700"
                )}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <PhaseIcon className="w-3 h-3" />
                )}
              </div>
              <span className="hidden sm:inline">{phase.shortName}</span>
            </div>
            {index < WORKFLOW_PHASES.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1",
                  index < currentPhaseIndex ? "bg-green-500/50" : "bg-zinc-700"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
