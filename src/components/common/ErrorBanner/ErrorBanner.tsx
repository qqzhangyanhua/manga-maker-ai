import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorBannerProps } from "./types";
import { Button } from "@/components/ui/button";

export function ErrorBanner({
  message,
  action,
  dismissible = true,
  onDismiss,
  className,
}: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "bg-red-500/10 border border-red-500/20 rounded-lg p-4",
        "flex items-start gap-3",
        className
      )}
    >
      {/* Icon */}
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-200">{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>

      {/* Dismiss button */}
      {dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-red-500/20 flex-shrink-0"
          onClick={onDismiss}
        >
          <X className="w-4 h-4 text-red-400" />
        </Button>
      )}
    </div>
  );
}
