"use client";

import { cn } from "@/lib/utils";

interface WorkflowProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function WorkflowProgressBar({
  currentStep,
  totalSteps,
}: WorkflowProgressBarProps) {
  const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="relative w-full">
      {/* Background Track */}
      <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-border rounded-full" />

      {/* Progress Fill */}
      <div
        className={cn(
          "absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-gradient-to-r from-green-500 to-primary rounded-full transition-all duration-500"
        )}
        style={{ width: `${percentage}%` }}
      />

      {/* Step Dots */}
      <div className="relative flex justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <div
              key={index}
              className={cn(
                "w-3 h-3 rounded-full border-2 transition-all duration-300",
                isCompleted &&
                  "bg-green-500 border-green-500 scale-110",
                isActive &&
                  "bg-primary border-primary scale-125 ring-4 ring-primary/30",
                !isCompleted &&
                  !isActive &&
                  "bg-background border-border"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
