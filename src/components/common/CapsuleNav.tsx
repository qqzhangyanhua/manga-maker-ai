"use client";

import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StageStatus = "completed" | "active" | "locked" | "available";

export interface CapsuleStage {
  id: string;
  label: string;
  icon: LucideIcon;
  status: StageStatus;
}

interface CapsuleNavProps {
  stages: CapsuleStage[];
  onStageClick?: (stageId: string) => void;
  className?: string;
}

export function CapsuleNav({ stages, onStageClick, className }: CapsuleNavProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-zinc-900/80 backdrop-blur-sm rounded-full border border-zinc-800/50", className)}>
      {stages.map((stage, index) => {
        const isClickable = stage.status !== "locked";

        return (
          <button
            key={stage.id}
            onClick={() => isClickable && onStageClick?.(stage.id)}
            disabled={!isClickable}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              stage.status === "active" && "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30",
              stage.status === "completed" && "text-green-400 hover:bg-zinc-800/50 cursor-pointer",
              stage.status === "available" && "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 cursor-pointer",
              stage.status === "locked" && "text-zinc-600 cursor-not-allowed opacity-50"
            )}
          >
            <span className="flex items-center justify-center w-5 h-5">
              {stage.status === "completed" ? (
                <Check className="w-4 h-4" />
              ) : stage.status === "locked" ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <stage.icon className="w-4 h-4" />
              )}
            </span>
            <span className="hidden sm:inline">{stage.label}</span>

            {/* Connector line */}
            {index < stages.length - 1 && (
              <div
                className={cn(
                  "absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-[2px]",
                  stage.status === "completed" ? "bg-green-500/50" : "bg-zinc-700"
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
