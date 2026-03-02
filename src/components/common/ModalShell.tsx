"use client";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const SIZE_MAP: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  full: "sm:max-w-4xl",
};

export function ModalShell({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  children,
  footer,
  className,
}: ModalShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-zinc-900 border-zinc-800 shadow-2xl",
          SIZE_MAP[size],
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-zinc-400">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-2">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
