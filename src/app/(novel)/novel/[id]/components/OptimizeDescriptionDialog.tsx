/**
 * AI优化/生成描述对话框
 */
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
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { novelTheme } from "../../theme";

interface OptimizeDescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentDescription: string;
  mode: "optimize" | "generate";
  onConfirm: (optimizedDescription: string) => void;
}

export function OptimizeDescriptionDialog({
  isOpen,
  onClose,
  projectId,
  currentDescription,
  mode,
  onConfirm,
}: OptimizeDescriptionDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [optimizedDescription, setOptimizedDescription] = useState("");
  const [hasResult, setHasResult] = useState(false);

  const handleProcess = async () => {
    if (mode === "optimize" && !currentDescription.trim()) {
      toast.error("请先输入项目描述");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/novel/projects/${projectId}/optimize-description`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: currentDescription,
            mode,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOptimizedDescription(data.optimized_description);
        setHasResult(true);
        toast.success(mode === "optimize" ? "描述优化完成" : "描述生成完成");
      } else {
        const error = await response.json();
        toast.error(error.error || "处理失败");
      }
    } catch (error) {
      console.error("处理失败:", error);
      toast.error("处理失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(optimizedDescription);
    handleClose();
  };

  const handleClose = () => {
    setHasResult(false);
    setOptimizedDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "optimize" ? "AI 优化描述" : "AI 生成描述"}
          </DialogTitle>
          <DialogDescription>
            {mode === "optimize"
              ? "AI 将优化您的项目描述，使其更加清晰和吸引人"
              : "AI 将根据您的输入生成项目描述"}
          </DialogDescription>
        </DialogHeader>

        {!hasResult ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Sparkles className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              {mode === "optimize"
                ? "点击下方按钮，AI 将优化您的项目描述"
                : "点击下方按钮，AI 将生成项目描述"}
            </p>
            <Button onClick={handleProcess} disabled={isProcessing} className={novelTheme.button.primary}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {mode === "optimize" ? "开始优化" : "开始生成"}
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">优化后的描述：</p>
              <Textarea
                value={optimizedDescription}
                onChange={(e) => setOptimizedDescription(e.target.value)}
                rows={8}
                className="resize-none bg-zinc-900/40 border-purple-500/10 focus-visible:ring-purple-500/50"
              />
              <p className="text-xs text-muted-foreground">
                您可以对生成的内容进行编辑
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handleConfirm}>
                <Check className="mr-2 h-4 w-4" />
                确认使用
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
