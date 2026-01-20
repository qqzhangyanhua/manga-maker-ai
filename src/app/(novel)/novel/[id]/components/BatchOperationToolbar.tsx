"use client";

import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { novelTheme } from "../../theme";
import { cn } from "@/lib/utils";

interface BatchOperationToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
}

export function BatchOperationToolbar({
  selectedCount,
  onDelete,
  onCancel,
}: BatchOperationToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 rounded-lg",
        "bg-purple-500/10 border border-purple-500/20",
        "animate-in slide-in-from-top-2 duration-200"
      )}
    >
      <span className="text-sm text-purple-300">
        已选择{" "}
        <span className="font-semibold text-purple-200">{selectedCount}</span>{" "}
        个章节
      </span>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className={novelTheme.button.outline}
        >
          <X className="h-4 w-4 mr-1" />
          取消
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onDelete}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          删除
        </Button>
      </div>
    </div>
  );
}
