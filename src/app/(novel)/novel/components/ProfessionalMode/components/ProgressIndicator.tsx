/**
 * 进度指示器组件
 */

import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_PHASES, WorkflowState } from "../types";

interface ProgressIndicatorProps {
  state: WorkflowState;
  onJumpToPhase?: (phase: string) => void;
}

export function ProgressIndicator({
  state,
  onJumpToPhase,
}: ProgressIndicatorProps) {
  const { session, stage } = state;

  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {WORKFLOW_PHASES.map((phase, index) => {
        const isCompleted = session?.completed_phases.includes(phase.phase);
        const isCurrent = session?.current_phase === phase.phase;
        const Icon = phase.icon;
        const canClick =
          isCompleted && stage !== "generating" && onJumpToPhase;

        return (
          <div key={phase.phase} className="flex items-center">
            <button
              type="button"
              onClick={() => canClick && onJumpToPhase(phase.phase)}
              disabled={!canClick}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                canClick && "cursor-pointer hover:bg-zinc-800/50",
                !canClick && "cursor-default"
              )}
              title={phase.description}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full transition-all",
                  isCompleted
                    ? "bg-green-500/20 text-green-500"
                    : isCurrent
                    ? "bg-purple-500/20 text-purple-500 ring-2 ring-purple-500"
                    : "bg-zinc-800 text-zinc-500"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs",
                  isCompleted
                    ? "text-green-400"
                    : isCurrent
                    ? "text-purple-400"
                    : "text-zinc-500"
                )}
              >
                {phase.shortName}
              </span>
            </button>
            {index < WORKFLOW_PHASES.length - 1 && (
              <ChevronRight
                className={cn(
                  "h-4 w-4 mx-0.5 flex-shrink-0",
                  isCompleted ? "text-green-500" : "text-zinc-600"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
