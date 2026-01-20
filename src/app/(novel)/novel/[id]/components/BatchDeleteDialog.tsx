"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { novelTheme } from "../../theme";
import { cn } from "@/lib/utils";

interface SelectedChapter {
  id: string;
  title: string;
  chapterNumber: number;
}

interface BatchDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedChapters: SelectedChapter[];
  onConfirm: (chapterIds: string[], softDelete: boolean) => Promise<void>;
}

type DeleteMode = "soft" | "hard";

export function BatchDeleteDialog({
  open,
  onOpenChange,
  selectedChapters,
  onConfirm,
}: BatchDeleteDialogProps) {
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("soft");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (selectedChapters.length === 0 || isDeleting) return;

    setIsDeleting(true);
    try {
      const chapterIds = selectedChapters.map((c) => c.id);
      await onConfirm(chapterIds, deleteMode === "soft");
    } finally {
      setIsDeleting(false);
    }
  };

  const sortedChapters = [...selectedChapters].sort(
    (a, b) => a.chapterNumber - b.chapterNumber
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", novelTheme.dialog.content)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className={novelTheme.dialog.titleIcon} />
            批量删除章节
            <Badge variant="secondary" className={novelTheme.badge.purple}>
              {selectedChapters.length} 个
            </Badge>
          </DialogTitle>
          <DialogDescription>
            请确认要删除以下章节，此操作
            {deleteMode === "soft" ? "可以恢复" : "不可恢复"}。
          </DialogDescription>
        </DialogHeader>

        {/* 章节列表 */}
        <ScrollArea className="h-[200px] rounded-md border border-purple-500/10 p-3">
          <div className="space-y-2">
            {sortedChapters.map((chapter) => (
              <div
                key={chapter.id}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-800/50"
              >
                <span className="text-sm truncate flex-1">{chapter.title}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  第 {chapter.chapterNumber} 章
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* 删除模式选择 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">删除模式</Label>
          <RadioGroup
            value={deleteMode}
            onValueChange={(v) => setDeleteMode(v as DeleteMode)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition-colors">
              <RadioGroupItem value="soft" id="soft" />
              <Label
                htmlFor="soft"
                className="flex-1 cursor-pointer text-sm font-normal"
              >
                软删除（可恢复）
                <span className="block text-xs text-muted-foreground mt-0.5">
                  章节将被标记为已删除，可以在后台恢复
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
              <RadioGroupItem value="hard" id="hard" />
              <Label
                htmlFor="hard"
                className="flex-1 cursor-pointer text-sm font-normal"
              >
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  永久删除（不可恢复）
                </span>
                <span className="block text-xs text-red-400/80 mt-0.5">
                  章节将被永久删除，无法恢复
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 警告提示 */}
        {deleteMode === "hard" && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              永久删除后，章节内容将无法恢复。请确认您已备份重要数据。
            </span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className={novelTheme.button.outline}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isDeleting || selectedChapters.length === 0}
            className={cn(
              deleteMode === "hard"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : novelTheme.button.primary
            )}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                删除中...
              </>
            ) : (
              `确认删除 (${selectedChapters.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
