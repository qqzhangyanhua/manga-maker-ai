/**
 * 标签合并对话框
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import type { Tag } from "../types";

export interface TagMergeDialogProps {
  open: boolean;
  tags: Tag[];
  sourceTag: Tag | null;
  onOpenChange: (open: boolean) => void;
  onMerge: (sourceTagId: string, targetTagId: string) => Promise<void>;
}

export function TagMergeDialog({
  open,
  tags,
  sourceTag,
  onOpenChange,
  onMerge,
}: TagMergeDialogProps) {
  const [targetTagId, setTargetTagId] = useState<string>("");
  const [merging, setMerging] = useState(false);

  // 过滤掉源标签，只显示可选的目标标签
  const availableTags = tags.filter((t) => t.id !== sourceTag?.id);

  const handleMerge = async () => {
    if (!sourceTag || !targetTagId) return;

    setMerging(true);
    try {
      await onMerge(sourceTag.id, targetTagId);
      setTargetTagId("");
      onOpenChange(false);
    } finally {
      setMerging(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTargetTagId("");
    }
    onOpenChange(open);
  };

  const targetTag = availableTags.find((t) => t.id === targetTagId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>合并标签</DialogTitle>
          <DialogDescription>
            将源标签的所有引用迁移到目标标签，然后删除源标签
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 源标签信息 */}
          <div className="space-y-2">
            <Label>源标签（将被删除）</Label>
            <div className="p-3 bg-muted rounded-md">
              <div className="font-medium">{sourceTag?.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                使用次数：{sourceTag?.usage_count ?? 0}
              </div>
            </div>
          </div>

          {/* 目标标签选择 */}
          <div className="space-y-2">
            <Label htmlFor="targetTag">目标标签（将保留）</Label>
            <Select value={targetTagId} onValueChange={setTargetTagId}>
              <SelectTrigger id="targetTag">
                <SelectValue placeholder="选择目标标签" />
              </SelectTrigger>
              <SelectContent>
                {availableTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name} ({tag.usage_count} 次使用)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 合并预览 */}
          {targetTag && sourceTag && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-orange-800">合并预览</div>
                  <ul className="mt-1 text-orange-700 space-y-1">
                    <li>
                      「{sourceTag.name}」的 {sourceTag.usage_count} 条引用将迁移到「{targetTag.name}」
                    </li>
                    <li>
                      合并后「{targetTag.name}」预计有 {sourceTag.usage_count + targetTag.usage_count} 条引用（实际可能更少，重复引用会被跳过）
                    </li>
                    <li>「{sourceTag.name}」将被永久删除</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={merging}
          >
            取消
          </Button>
          <Button
            onClick={handleMerge}
            disabled={!targetTagId || merging}
            variant="destructive"
          >
            {merging ? "合并中..." : "确认合并"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
