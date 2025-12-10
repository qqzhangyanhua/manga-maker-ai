/**
 * 分割分镜对话框组件
 * 将一个分镜拆分为两个独立的分镜
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { Panel } from "../../types/script-editor.types";

interface SplitPanelDialogProps {
  open: boolean;
  panel: Panel | null;
  onOpenChange: (open: boolean) => void;
  onSplit: () => void;
  onError: (message: string) => void;
}

export function SplitPanelDialog({
  open,
  panel,
  onOpenChange,
  onSplit,
  onError,
}: SplitPanelDialogProps) {
  const [splitHint, setSplitHint] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!panel) {
      onError("未选择分镜");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/panel/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_id: panel.id,
          split_hint: splitHint.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "分割分镜失败");
      }

      setSplitHint("");
      onOpenChange(false);
      onSplit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "分割分镜失败";
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!panel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>分割分镜</DialogTitle>
          <DialogDescription>
            将分镜 #{panel.panel_order} 拆分为两个独立的分镜
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 原分镜预览 */}
          <div className="p-3 bg-muted/30 rounded-lg space-y-2">
            <Label className="text-xs text-muted-foreground">原分镜内容</Label>
            <p className="text-sm">{panel.description || "无描述"}</p>
            {panel.dialogue && (
              <p className="text-sm italic text-muted-foreground">
                "{panel.dialogue}"
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="split-hint">分割提示（可选）</Label>
            <Textarea
              id="split-hint"
              placeholder="例如：第一镜是对话，第二镜是动作"
              value={splitHint}
              onChange={(e) => setSplitHint(e.target.value)}
              rows={3}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              AI 将根据您的提示智能拆分分镜。留空则自动拆分为两个连贯的画面
            </p>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 拆分后，原分镜将被替换为两个新分镜，并自动调整后续分镜的顺序
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              拆分分镜
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
