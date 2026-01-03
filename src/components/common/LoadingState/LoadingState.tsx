import { cn } from "@/lib/utils";
import { LoadingStateProps } from "./types";
import { LoadingStep } from "./LoadingStep";

export function LoadingState({ title, steps, className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        "bg-[#1a1a1f]/80 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6",
        className
      )}
    >
      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-6">{title}</h3>

      {/* Steps */}
      <div className="space-y-1">
        {steps.map((step, index) => (
          <LoadingStep
            key={index}
            label={step.label}
            status={step.status}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
