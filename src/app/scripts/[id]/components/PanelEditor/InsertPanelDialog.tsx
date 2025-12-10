/**
 * 插入分镜对话框组件
 * 在指定位置插入新分镜
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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface InsertPanelDialogProps {
  open: boolean;
  projectId: string;
  insertAfterIndex: number;
  onOpenChange: (open: boolean) => void;
  onInserted: () => void;
  onError: (message: string) => void;
}

export function InsertPanelDialog({
  open,
  projectId,
  insertAfterIndex,
  onOpenChange,
  onInserted,
  onError,
}: InsertPanelDialogProps) {
  const [description, setDescription] = useState("");
  const [useLlm, setUseLlm] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      onError("请输入分镜描述");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/panel/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          insert_after_order: insertAfterIndex,
          description: description.trim(),
          use_llm: useLlm,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "插入分镜失败");
      }

      setDescription("");
      onOpenChange(false);
      onInserted();
    } catch (error) {
      const message = error instanceof Error ? error.message : "插入分镜失败";
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>插入新分镜</DialogTitle>
          <DialogDescription>
            在分镜 #{insertAfterIndex + 1} 之后插入一个新分镜
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">分镜描述</Label>
            <Textarea
              id="description"
              placeholder="描述这个新分镜的内容，例如：角色转身看向远方，表情凝重"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              详细描述这个新分镜的画面内容、角色动作、情绪等信息
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="use-llm" className="text-sm font-medium">
                使用 AI 优化
              </Label>
              <p className="text-xs text-muted-foreground">
                AI 将根据上下文自动生成详细的分镜参数
              </p>
            </div>
            <Switch
              id="use-llm"
              checked={useLlm}
              onCheckedChange={setUseLlm}
              disabled={submitting}
            />
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
            <Button type="submit" disabled={submitting || !description.trim()}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              插入分镜
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
