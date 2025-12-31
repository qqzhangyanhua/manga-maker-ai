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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wand2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ImageIcon,
  Palette,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useComicStyles } from "@/app/scripts/[id]/hooks/useComicStyles";
import { ReferenceImageSelector } from "@/app/scripts/[id]/components/ReferenceImageSelector";
import type { ReferenceImage } from "@/types/reference-image.types";

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
  storyId?: string; // 新增:用于参考图选择
  panels?: Array<{ id: string; generated_image?: string; panel_order?: number; [key: string]: unknown }>; // 新增:用于参考图选择
}

type GenerateStatus = "idle" | "generating" | "completed" | "error";

export default function BatchGenerateDialog({
  open,
  onOpenChange,
  selectedPanelIds,
  onComplete,
  storyId,
  panels = [],
}: BatchGenerateDialogProps) {
  const { toast } = useToast();
  const { data: comicStyles = [], isLoading: stylesLoading } = useComicStyles();

  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceSelectorOpen, setReferenceSelectorOpen] = useState(false);

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
    setSelectedStyleId(null);
    setReferenceImages([]);
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
          style_key: selectedStyleId,
          reference_image_urls: referenceImages.map(img => img.url),
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
          {/* 风格选择和参考图选择 */}
          {status === "idle" && (
            <>
              {/* 风格选择器 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  漫画风格 (必选)
                </Label>
                <Select
                  value={selectedStyleId || undefined}
                  onValueChange={(value) => setSelectedStyleId(value)}
                  disabled={stylesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择漫画风格" />
                  </SelectTrigger>
                  <SelectContent>
                    {stylesLoading ? (
                      <SelectItem value="loading" disabled>
                        加载中...
                      </SelectItem>
                    ) : comicStyles.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        暂无可用风格
                      </SelectItem>
                    ) : (
                      comicStyles.map((style) => (
                        <SelectItem key={style.id} value={style.id}>
                          {style.name_zh}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  选择用于生成图片的漫画风格
                </p>
              </div>

              {/* 参考图选择器 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  参考图片 {storyId && "(必选)"}
                </Label>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setReferenceSelectorOpen(true)}
                  disabled={!storyId || !panels}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {referenceImages.length > 0
                    ? `已选择 ${referenceImages.length} 张参考图`
                    : !storyId
                      ? "参考图功能不可用"
                      : "选择参考图片"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {storyId
                    ? "选择角色、场景等参考图片用于生成"
                    : "此功能仅在脚本编辑器中可用"}
                </p>

                {/* 已选参考图预览 */}
                {referenceImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 p-2 border rounded-md">
                    {referenceImages.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.url}
                          alt={img.label}
                          className="w-full h-16 object-cover rounded"
                        />
                        <button
                          onClick={() =>
                            setReferenceImages((prev) =>
                              prev.filter((i) => i.id !== img.id)
                            )
                          }
                          className="absolute top-0 right-0 p-1 bg-destructive text-destructive-foreground rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <p className="text-xs truncate mt-1">{img.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
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
                disabled={selectedPanelIds.length === 0 || !selectedStyleId}
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

      {/* 参考图选择器对话框 */}
      {storyId && panels && (
        <ReferenceImageSelector
          open={referenceSelectorOpen}
          onOpenChange={setReferenceSelectorOpen}
          storyId={storyId}
          panels={panels as unknown as import("@/app/scripts/[id]/types/script-editor.types").Panel[]}
          onConfirm={(images) => {
            setReferenceImages(images);
            setReferenceSelectorOpen(false);
          }}
        />
      )}
    </Dialog>
  );
}
