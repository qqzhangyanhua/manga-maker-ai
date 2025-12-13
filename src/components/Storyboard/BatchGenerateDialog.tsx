/**
 * 批量生成图片弹窗组件
 *
 * 功能：
 * - 显示选中分镜数量和状态
 * - 支持设置风格覆盖
 * - 显示生成进度和结果
 * - 支持查看生成的图片
 */

"use client";

import { useState, useCallback } from "react";
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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wand2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GenerateResult {
  panel_id: string;
  success: boolean;
  image_url?: string;
  error?: string;
}

interface BatchGenerateResponse {
  success: boolean;
  results: GenerateResult[];
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  message: string;
  error?: string;
}

interface BatchGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPanelIds: string[];
  onComplete: () => void;
}

type GenerateStatus = "idle" | "generating" | "completed" | "error";

export default function BatchGenerateDialog({
  open,
  onOpenChange,
  selectedPanelIds,
  onComplete,
}: BatchGenerateDialogProps) {
  const { toast } = useToast();
  const [styleOverride, setStyleOverride] = useState("");
  const [status, setStatus] = useState<GenerateStatus>("idle");
  const [results, setResults] = useState<GenerateResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
  } | null>(null);

  // 重置状态
  const resetState = useCallback(() => {
    setStyleOverride("");
    setStatus("idle");
    setResults([]);
    setSummary(null);
  }, []);

  // 关闭弹窗
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && status !== "generating") {
      resetState();
    }
    onOpenChange(newOpen);
  };

  // 开始生成
  const handleGenerate = async () => {
    if (selectedPanelIds.length === 0) return;

    setStatus("generating");
    setResults([]);
    setSummary(null);

    try {
      const response = await fetch("/api/panel/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: selectedPanelIds,
          style: styleOverride || undefined,
        }),
      });

      const data: BatchGenerateResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "批量生成失败");
      }

      setResults(data.results);
      setSummary({
        total: data.total,
        succeeded: data.succeeded,
        failed: data.failed,
        skipped: data.skipped,
      });
      setStatus("completed");

      toast({
        title: "批量生成完成",
        description: data.message,
      });

      // 通知父组件刷新数据
      onComplete();
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setStatus("error");
      toast({
        title: "生成失败",
        description: message,
        variant: "destructive",
      });
    }
  };

  // 计算进度
  const progress =
    status === "generating"
      ? 50 // 生成中显示50%
      : status === "completed"
        ? 100
        : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            批量生成图片
          </DialogTitle>
          <DialogDescription>
            为选中的 {selectedPanelIds.length} 个分镜生成图片。
            只有包含提示词的分镜才会被生成。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 风格覆盖输入 */}
          {status === "idle" && (
            <div className="space-y-2">
              <Label htmlFor="style" className="text-sm font-medium">
                风格覆盖 (可选)
              </Label>
              <Input
                id="style"
                placeholder="例如: manga style, watercolor, cyberpunk"
                value={styleOverride}
                onChange={(e) => setStyleOverride(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                留空则使用项目默认风格
              </p>
            </div>
          )}

          {/* 生成进度 */}
          {status === "generating" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">正在生成图片，请稍候...</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                批量生成可能需要较长时间，请勿关闭此窗口
              </p>
            </div>
          )}

          {/* 生成结果 */}
          {status === "completed" && summary && (
            <div className="space-y-4">
              {/* 统计摘要 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 text-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-lg font-semibold text-green-600">
                    {summary.succeeded}
                  </p>
                  <p className="text-xs text-muted-foreground">成功</p>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 text-center">
                  <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                  <p className="text-lg font-semibold text-red-600">
                    {summary.failed}
                  </p>
                  <p className="text-xs text-muted-foreground">失败</p>
                </div>
                <div className="rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-3 text-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                  <p className="text-lg font-semibold text-yellow-600">
                    {summary.skipped}
                  </p>
                  <p className="text-xs text-muted-foreground">跳过</p>
                </div>
              </div>

              {/* 详细结果列表 */}
              {results.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">生成详情</Label>
                  <ScrollArea className="h-[200px] rounded-md border p-2">
                    <div className="space-y-2">
                      {results.map((result, index) => (
                        <div
                          key={result.panel_id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm">
                              分镜 #{index + 1}
                            </span>
                          </div>
                          {result.success && result.image_url ? (
                            <a
                              href={result.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ImageIcon className="w-3 h-3" />
                              查看图片
                            </a>
                          ) : result.error ? (
                            <span className="text-xs text-destructive truncate max-w-[150px]">
                              {result.error}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* 错误状态 */}
          {status === "error" && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-center">
              <XCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">生成过程中发生错误</p>
              <p className="text-xs text-muted-foreground mt-1">
                请检查网络连接和API配置后重试
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {status === "idle" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={selectedPanelIds.length === 0}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                开始生成 ({selectedPanelIds.length}格)
              </Button>
            </>
          )}

          {status === "generating" && (
            <Button variant="outline" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </Button>
          )}

          {(status === "completed" || status === "error") && (
            <Button onClick={() => handleOpenChange(false)}>关闭</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
