"use client";

import Link from "next/link";
import { BookOpen, Users, LayoutGrid, Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowStepConfig, WorkflowProgress } from "./types";

interface WorkflowStepProps {
  config: WorkflowStepConfig;
  progress: WorkflowProgress;
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
}

const ICONS = {
  story: BookOpen,
  character: Users,
  panel: LayoutGrid,
  export: Download,
};

export function WorkflowStep({
  config,
  progress,
  isActive,
  isCompleted,
  isLocked,
}: WorkflowStepProps) {
  const Icon = ICONS[config.icon];

  const content = (
    <div
      className={cn(
        "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300",
        isCompleted &&
          "bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400",
        isActive &&
          !isCompleted &&
          "bg-primary/10 border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30",
        isLocked &&
          "bg-muted/50 border-border/50 text-muted-foreground opacity-60",
        !isCompleted &&
          !isActive &&
          !isLocked &&
          "bg-card border-border hover:border-primary/50 hover:bg-primary/5"
      )}
    >
      {/* Step Number Badge */}
      <div
        className={cn(
          "absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
          isCompleted && "bg-green-500 text-white",
          isActive && !isCompleted && "bg-primary text-primary-foreground",
          isLocked && "bg-muted-foreground/30 text-muted-foreground",
          !isCompleted &&
            !isActive &&
            !isLocked &&
            "bg-border text-muted-foreground"
        )}
      >
        {isCompleted ? <Check className="w-3.5 h-3.5" /> : config.step}
      </div>

      {/* Icon */}
      <div
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mb-3 mt-2",
          isCompleted && "bg-green-500/20",
          isActive && !isCompleted && "bg-primary/20 animate-pulse",
          isLocked && "bg-muted",
          !isCompleted && !isActive && !isLocked && "bg-muted"
        )}
      >
        <Icon
          className={cn(
            "w-6 h-6",
            isCompleted && "text-green-600 dark:text-green-400",
            isActive && !isCompleted && "text-primary",
            isLocked && "text-muted-foreground",
            !isCompleted && !isActive && !isLocked && "text-foreground"
          )}
        />
      </div>

      {/* Title */}
      <h3
        className={cn(
          "font-semibold text-sm mb-1",
          isCompleted && "text-green-600 dark:text-green-400",
          isActive && !isCompleted && "text-primary",
          isLocked && "text-muted-foreground"
        )}
      >
        {config.title}
      </h3>

      {/* Description or Progress */}
      <p className="text-xs text-muted-foreground text-center">
        {isCompleted ? config.completedText(progress) : config.description}
      </p>

      {/* Active Indicator */}
      {isActive && !isCompleted && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
            当前步骤
          </span>
        </div>
      )}
    </div>
  );

  if (isLocked) {
    return <div className="cursor-not-allowed">{content}</div>;
  }

  return (
    <Link href={config.href} className="block">
      {content}
    </Link>
  );
}
