import { Check, Loader2, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingStep as LoadingStepType, LoadingStepStatus } from "./types";

interface LoadingStepProps {
  label: string;
  status: LoadingStepStatus;
  isLast?: boolean;
}

export function LoadingStep({ label, status, isLast }: LoadingStepProps) {
  const getIcon = () => {
    switch (status) {
      case "completed":
        return <Check className="w-5 h-5 text-green-500" />;
      case "loading":
        return <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />;
      case "error":
        return <X className="w-5 h-5 text-red-500" />;
      case "pending":
      default:
        return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTextColor = () => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "loading":
        return "text-orange-400";
      case "error":
        return "text-red-400";
      case "pending":
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="flex items-start gap-3">
      {/* Icon with connector line */}
      <div className="flex flex-col items-center">
        <div className="flex-shrink-0">{getIcon()}</div>
        {!isLast && (
          <div
            className={cn(
              "w-px h-8 mt-1",
              status === "completed" ? "bg-green-500/30" : "bg-gray-700"
            )}
          />
        )}
      </div>

      {/* Label */}
      <div className={cn("flex-1 pt-0.5", getTextColor())}>
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}
