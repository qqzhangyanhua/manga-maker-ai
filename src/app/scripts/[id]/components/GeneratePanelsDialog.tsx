/**
 * AI生成分镜对话框
 * 让用户选择生成模式：覆盖或扩写
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle, Sparkles } from "lucide-react";

interface GeneratePanelsDialogProps {
  open: boolean;
  existingPanelCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: "overwrite" | "append", panelCount?: number) => void;
}

export function GeneratePanelsDialog({
  open,
  existingPanelCount,
  onOpenChange,
  onConfirm,
}: GeneratePanelsDialogProps) {
  const [mode, setMode] = useState<"overwrite" | "append">("append");
  const [panelCount, setPanelCount] = useState<string>("8");

  const handleConfirm = () => {
    const count = parseInt(panelCount, 10);
    onConfirm(mode, count > 0 ? count : undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI生成分镜
          </DialogTitle>
          <DialogDescription>
            当前章节已有 {existingPanelCount} 个分镜，请选择生成模式
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as "overwrite" | "append")}>
            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
              <RadioGroupItem value="append" id="append" />
              <div className="flex-1">
                <Label htmlFor="append" className="font-medium cursor-pointer">
                  扩写模式（推荐）
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  在现有 {existingPanelCount} 个分镜基础上追加新分镜，保留已有内容
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
              <RadioGroupItem value="overwrite" id="overwrite" />
              <div className="flex-1">
                <Label htmlFor="overwrite" className="font-medium cursor-pointer">
                  覆盖模式
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  删除现有分镜，重新生成全部内容
                </p>
              </div>
            </div>
          </RadioGroup>

          {mode === "overwrite" && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">
                警告：覆盖模式将删除现有的 {existingPanelCount} 个分镜及其生成的图片，此操作不可恢复
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="panelCount">
              {mode === "append" ? "追加分镜数量" : "生成分镜数量"}
            </Label>
            <Input
              id="panelCount"
              type="number"
              min="1"
              max="20"
              value={panelCount}
              onChange={(e) => setPanelCount(e.target.value)}
              placeholder="建议 8-15 个"
            />
            <p className="text-xs text-muted-foreground">
              建议 8-15 个分镜，可根据章节内容调整
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            <Sparkles className="w-4 h-4 mr-2" />
            开始生成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
