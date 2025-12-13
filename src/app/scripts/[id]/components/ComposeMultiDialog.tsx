/**
 * 多格合成对话框组件
 * 将多个分镜合成为一张多格漫画图片
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, CheckCircle2, AlertCircle, Grid3x3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Panel } from "../types/script-editor.types";

interface ComposeMultiDialogProps {
  open: boolean;
  panels: Panel[];
  selectedPanelIds: string[];
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ComposeMultiDialog({
  open,
  panels,
  selectedPanelIds,
  onOpenChange,
  onSuccess,
}: ComposeMultiDialogProps) {
  const { toast } = useToast();
  const [isComposing, setIsComposing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [composedImageUrl, setComposedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 获取选中的分镜（按 panel_order 排序）
  const selectedPanels = selectedPanelIds
    .map((id) => panels.find((p) => p.id === id))
    .filter((p): p is Panel => p !== undefined)
    .sort((a, b) => a.panel_order - b.panel_order);

  // 计算布局信息
  const count = selectedPanels.length;
  let layoutDesc = "";
  if (count === 2) layoutDesc = "2格横排";
  else if (count === 3) layoutDesc = "3格横排";
  else if (count === 4) layoutDesc = "2×2网格";
  else if (count === 5) layoutDesc = "2×3网格（5格）";
  else if (count === 6) layoutDesc = "2×3网格";

  // 重置状态
  useEffect(() => {
    if (open) {
      setIsComposing(false);
      setProgress(0);
      setComposedImageUrl(null);
      setError(null);
    }
  }, [open]);

  // 开始合成
  async function handleCompose(): Promise<void> {
    setIsComposing(true);
    setProgress(10);
    setError(null);

    try {
      // 调用合成 API
      const response = await fetch("/api/panel/compose-multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: selectedPanelIds,
        }),
      });

      setProgress(50);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "合成失败");
      }

      const data = await response.json();
      setProgress(100);
      setComposedImageUrl(data.composed_image_url);

      toast({
        title: "合成成功",
        description: `已将 ${count} 个分镜合成为多格图片`,
      });

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误";
      setError(message);
      toast({
        title: "合成失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsComposing(false);
    }
  }

  // 下载合成图片
  function handleDownload(): void {
    if (!composedImageUrl) return;

    const link = document.createElement("a");
    link.href = composedImageUrl;
    link.download = `composed-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "下载成功",
      description: "多格图片已保存到本地",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5" />
            合成多格图片
          </DialogTitle>
          <DialogDescription>
            将选中的 {count} 个分镜合成为一张 {layoutDesc} 的多格漫画图片
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 分镜预览 */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <h3 className="text-sm font-medium mb-3">选中的分镜</h3>
            <div className="grid grid-cols-3 gap-3">
              {selectedPanels.map((panel) => (
                <div
                  key={panel.id}
                  className="border rounded p-2 bg-background space-y-2"
                >
                  <div className="text-xs text-muted-foreground">
                    #{panel.panel_order}
                  </div>
                  {panel.generated_image || panel.image_url ? (
                    <img
                      src={panel.generated_image || panel.image_url || ""}
                      alt={`Panel ${panel.panel_order}`}
                      className="w-full h-24 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-24 bg-muted rounded flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">无图片</span>
                    </div>
                  )}
                  <p className="text-xs line-clamp-2">
                    {panel.visual_prompt || panel.description || "无描述"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 合成进度 */}
          {isComposing && (
            <div className="border rounded-lg p-4 bg-primary/5 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">合成中...</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 合成结果 */}
          {composedImageUrl && !isComposing && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20 space-y-3">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">合成完成</span>
              </div>
              <img
                src={composedImageUrl}
                alt="Composed result"
                className="w-full border rounded"
              />
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="border border-destructive rounded-lg p-4 bg-destructive/5 space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">合成失败</span>
              </div>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {composedImageUrl ? (
            <>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                下载图片
              </Button>
              <Button onClick={() => onOpenChange(false)}>关闭</Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isComposing}
              >
                取消
              </Button>
              <Button onClick={handleCompose} disabled={isComposing}>
                {isComposing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    合成中...
                  </>
                ) : (
                  <>
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    开始合成
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
