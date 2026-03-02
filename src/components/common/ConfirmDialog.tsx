"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  {
    icon: typeof AlertCircle;
    iconBg: string;
    iconColor: string;
    confirmClass: string;
  }
> = {
  danger: {
    icon: AlertCircle,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-400",
    confirmClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-400",
    confirmClass: "bg-yellow-600 hover:bg-yellow-700 text-white",
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    confirmClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = "danger",
  confirmLabel = "确认",
  cancelLabel = "取消",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const config = VARIANT_CONFIG[variant];
  const IconComp = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                config.iconBg
              )}
            >
              <IconComp className={cn("w-5 h-5", config.iconColor)} />
            </div>
            <div>
              <AlertDialogTitle className="text-white">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400 mt-1">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancel}
            className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={config.confirmClass}
          >
            {isLoading ? "处理中..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
