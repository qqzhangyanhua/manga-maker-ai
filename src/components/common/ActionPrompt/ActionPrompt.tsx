import { cn } from "@/lib/utils";
import { ActionPromptProps, ActionPromptVariant } from "./types";

const variantStyles: Record<ActionPromptVariant, string> = {
  info: "bg-blue-500/10 border-blue-500/20",
  success: "bg-green-500/10 border-green-500/20",
  warning: "bg-orange-500/10 border-orange-500/20",
};

const iconStyles: Record<ActionPromptVariant, string> = {
  info: "text-blue-400",
  success: "text-green-400",
  warning: "text-orange-400",
};

const textStyles: Record<ActionPromptVariant, string> = {
  info: "text-blue-200",
  success: "text-green-200",
  warning: "text-orange-200",
};

export function ActionPrompt({
  icon,
  message,
  action,
  variant = "info",
  className,
}: ActionPromptProps) {
  return (
    <div
      className={cn(
        "border rounded-lg p-4 flex items-center gap-4",
        variantStyles[variant],
        className
      )}
    >
      {/* Icon */}
      <div className={cn("flex-shrink-0 w-10 h-10", iconStyles[variant])}>
        {icon}
      </div>

      {/* Message */}
      <p className={cn("flex-1 text-sm font-medium", textStyles[variant])}>
        {message}
      </p>

      {/* Action */}
      <div className="flex-shrink-0">{action}</div>
    </div>
  );
}
