"use client";

/**
 * 分镜九宫格生成对话框
 * 
 * 为单个分镜生成 9 张候选图片，用户选择最佳一张
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Check,
  RefreshCw,
  AlertCircle,
  Sparkles,
  X,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PromptRefineDialog } from "./PromptRefineDialog";

// 九宫格图片类型
interface NineGridImage {
  grid_position: number;
  image_url: string;
  seed: number;
}

// SSE 事件类型
interface ProgressEvent {
  current: number;
  total: number;
  status: string;
}

interface ImageEvent {
  grid_position: number;
  image_url: string;
  seed: number;
}

interface CompletedEvent {
  nine_grid_generation_id: string;
  images: NineGridImage[];
  total_generated: number;
}

interface ShotNineGridDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shotId: string;
  shotDescription: string;
  promptCompositionId?: string;
  existingImages?: NineGridImage[];
  selectedPosition?: number | null;
  onSuccess?: () => void;
}

// 稳定的空数组引用，避免默认参数每次渲染创建新对象导致无限循环
const EMPTY_IMAGES: NineGridImage[] = [];

export function ShotNineGridDialog({
  open,
  onOpenChange,
  shotId,
  shotDescription,
  promptCompositionId,
  existingImages = EMPTY_IMAGES,
  selectedPosition = null,
  onSuccess,
}: ShotNineGridDialogProps) {
  const queryClient = useQueryClient();

  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [images, setImages] = useState<NineGridImage[]>(existingImages);
  const [selected, setSelected] = useState<number | null>(selectedPosition);
  const [nineGridId, setNineGridId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 微调对话框状态
  const [refineDialogOpen, setRefineDialogOpen] = useState(false);
  const [refineImageUrl, setRefineImageUrl] = useState<string | undefined>(undefined);

  // SSE 控制器
  const abortControllerRef = useRef<AbortController | null>(null);

  // 重置状态
  useEffect(() => {
    if (open) {
      setImages(existingImages);
      setSelected(selectedPosition);
      setError(null);
      setProgress(0);
      setIsGenerating(false);
    }
  }, [open, existingImages, selectedPosition]);

  // 开始生成
  const handleStartGeneration = useCallback(async () => {
    setIsGenerating(true);
    setProgress(0);
    setImages([]);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/api/canvas/shot/${shotId}/generate-nine-grid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_composition_id: promptCompositionId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "生成失败");
      }

      // 读取 SSE 流
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取响应流");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7);
            const nextLine = lines[lines.indexOf(line) + 1];
            if (nextLine?.startsWith("data: ")) {
              const data = JSON.parse(nextLine.slice(6));

              switch (eventType) {
                case "progress":
                  const progressData = data as ProgressEvent;
                  setProgress((progressData.current / progressData.total) * 100);
                  break;
                case "image":
                  const imageData = data as ImageEvent;
                  setImages((prev) => [...prev, imageData]);
                  break;
                case "completed":
                  const completedData = data as CompletedEvent;
                  setNineGridId(completedData.nine_grid_generation_id);
                  setIsGenerating(false);
                  toast.success("九宫格生成完成", {
                    description: `成功生成 ${completedData.total_generated} 张候选图`,
                  });
                  break;
                case "error":
                  throw new Error(data.message);
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.info("生成已取消");
      } else {
        const errorMessage = err instanceof Error ? err.message : "生成失败";
        setError(errorMessage);
        toast.error("生成失败", { description: errorMessage });
      }
      setIsGenerating(false);
    }
  }, [shotId, promptCompositionId]);

  // 取消生成
  const handleCancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  // 选择图片
  const handleSelectImage = useCallback((position: number) => {
    if (isGenerating) return;
    setSelected(position);
  }, [isGenerating]);

  // 确认选择
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!nineGridId || !selected) {
        throw new Error("请先选择一张图片");
      }

      const res = await fetch(`/api/canvas/nine-grid-selection/${nineGridId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grid_position: selected }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "选择失败");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("已确认选择");
      queryClient.invalidateQueries({ queryKey: ["shot-detail"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("选择失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    },
  });

  const handleConfirmSelection = useCallback(() => {
    confirmMutation.mutate();
  }, [confirmMutation]);

  // 打开微调对话框
  const handleOpenRefineDialog = useCallback(() => {
    const selectedImage = images.find((img) => img.grid_position === selected);
    setRefineImageUrl(selectedImage?.image_url);
    setRefineDialogOpen(true);
  }, [images, selected]);

  // 微调完成回调
  const handleRefineSuccess = useCallback(() => {
    setRefineDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["shot-detail"] });
    onSuccess?.();
    onOpenChange(false);
  }, [queryClient, onSuccess, onOpenChange]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">九宫格候选图</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {shotDescription || "生成 9 张候选图，选择最佳一张"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* 生成进度 */}
          {isGenerating && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">生成进度</span>
                <span className="text-purple-400">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在生成第 {images.length + 1} / 9 张...
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded flex items-center gap-2 text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 九宫格展示 */}
          {images.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((position) => {
                  const image = images.find((img) => img.grid_position === position);
                  const isSelected = selected === position;

                  return (
                    <div
                      key={position}
                      className={cn(
                        "relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                        isSelected
                          ? "border-purple-500 ring-2 ring-purple-500/30"
                          : "border-zinc-700 hover:border-zinc-500",
                        !image && "bg-zinc-900"
                      )}
                      onClick={() => image && handleSelectImage(position)}
                    >
                      {image ? (
                        <>
                          <img
                            src={image.image_url}
                            alt={`候选图 ${position}`}
                            className="w-full h-full object-cover"
                          />
                          {/* 位置标识 */}
                          <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-xs text-white">
                            #{position}
                          </div>
                          {/* 选中标识 */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                                <Check className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                          {isGenerating && images.length < position ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin mb-1" />
                              <span className="text-xs">待生成</span>
                            </>
                          ) : (
                            <>
                              <X className="w-6 h-6 mb-1" />
                              <span className="text-xs">生成失败</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : !isGenerating ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-zinc-500">
              <Sparkles className="w-12 h-12 mb-4 text-purple-400" />
              <p className="text-lg font-medium text-white mb-2">生成九宫格候选图</p>
              <p className="text-sm text-center max-w-md">
                AI 将为此分镜生成 9 张不同的候选图片，您可以从中选择最满意的一张。
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {/* 生成/取消按钮 */}
          {isGenerating ? (
            <Button
              variant="outline"
              onClick={handleCancelGeneration}
              className="flex-1 sm:flex-none"
            >
              <X className="w-4 h-4 mr-2" />
              取消生成
            </Button>
          ) : (
            <Button
              variant={images.length > 0 ? "outline" : "default"}
              onClick={handleStartGeneration}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {images.length > 0 ? "重新生成" : "开始生成"}
            </Button>
          )}

          {/* 微调按钮 */}
          {images.length > 0 && !isGenerating && selected && (
            <Button
              variant="outline"
              onClick={handleOpenRefineDialog}
              className="flex-1 sm:flex-none"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              微调 Prompt
            </Button>
          )}

          {/* 确认选择按钮 */}
          {images.length > 0 && !isGenerating && (
            <Button
              onClick={handleConfirmSelection}
              disabled={!selected || confirmMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  确认中...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  确认选择
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Prompt 微调对话框 - 必须在外层 Dialog 之外，避免嵌套导致无限循环 */}
    <PromptRefineDialog
      open={refineDialogOpen}
      onOpenChange={setRefineDialogOpen}
      shotId={shotId}
      originalImageUrl={refineImageUrl}
      onSuccess={handleRefineSuccess}
    />
    </>
  );
}
