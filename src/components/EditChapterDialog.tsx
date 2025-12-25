/**
 * 编辑章节对话框
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Chapter {
  id: string;
  title: string;
  summary: string | null;
}

interface EditChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: Chapter | null;
  onSuccess: () => void;
}

export function EditChapterDialog({
  open,
  onOpenChange,
  chapter,
  onSuccess,
}: EditChapterDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // 同步章节数据到表单
  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title);
      setSummary(chapter.summary || "");
    }
  }, [chapter]);

  async function handleUpdate() {
    if (!chapter) return;

    if (!title.trim()) {
      toast({
        title: "请输入章节标题",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/chapter/${chapter.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "更新章节失败");
      }

      toast({
        title: "章节已更新",
        description: data.chapter.title,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update chapter:", error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-gray-100">编辑章节</DialogTitle>
          <DialogDescription className="text-gray-400">
            修改章节的标题和梗概
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 章节标题 */}
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-gray-300">
              章节标题 *
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：第1章：开端"
              className="bg-gray-800 border-gray-700 text-gray-100"
              disabled={isUpdating}
            />
          </div>

          {/* 章节梗概 */}
          <div className="space-y-2">
            <Label htmlFor="edit-summary" className="text-gray-300">
              章节梗概（可选）
            </Label>
            <Textarea
              id="edit-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="描述本章的主要内容和情节..."
              rows={6}
              className="bg-gray-800 border-gray-700 text-gray-100 resize-none"
              disabled={isUpdating}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isUpdating}
            className="border-gray-700 text-gray-400"
          >
            取消
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating || !title.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                更新中
              </>
            ) : (
              "保存修改"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
