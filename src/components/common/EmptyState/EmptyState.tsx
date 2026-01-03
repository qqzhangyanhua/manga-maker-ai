import { cn } from "@/lib/utils";
import { EmptyStateProps } from "./types";

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isCompact ? "py-8 px-4" : "py-12 px-6",
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "mb-4 text-gray-400",
          isCompact ? "w-12 h-12" : "w-16 h-16"
        )}
      >
        {icon}
      </div>

      {/* Title */}
      <h3
        className={cn(
          "font-semibold text-white mb-2",
          isCompact ? "text-lg" : "text-xl"
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            "text-gray-400 mb-6",
            isCompact ? "text-sm max-w-sm" : "text-base max-w-md"
          )}
        >
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
