"use client";

/**
 * Prompt 微调对话框
 * 
 * 允许用户编辑 Prompt 并重新生成单张图片
 */

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Check,
  RefreshCw,
  Wand2,
  RotateCcw,
  ArrowLeftRight,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { PromptInfoDetailed, GenerationParams } from "./shared-types";

interface PromptRefineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shotId: string;
  originalImageUrl?: string;
  onSuccess?: () => void;
}

export function PromptRefineDialog({
  open,
  onOpenChange,
  shotId,
  originalImageUrl,
  onSuccess,
}: PromptRefineDialogProps) {
  const queryClient = useQueryClient();

  // 状态
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [refinedImageUrl, setRefinedImageUrl] = useState<string | null>(null);
  const [refinedCompositionId, setRefinedCompositionId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [params, setParams] = useState<GenerationParams>({
    width: 1024,
    height: 768,
    steps: 30,
    cfg_scale: 7.5,
  });

  // 获取原始 Prompt 信息
  const { data: promptInfo, isLoading: isLoadingPrompt } = useQuery({
    queryKey: ["shot-prompt-info", shotId],
    queryFn: async () => {
      const res = await fetch(`/api/canvas/shot/${shotId}/refine-prompt`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "获取 Prompt 信息失败");
      }
      const data = await res.json();
      return data.prompt_info as PromptInfoDetailed;
    },
    enabled: open,
  });

  // 初始化 Prompt
  useEffect(() => {
    if (promptInfo) {
      setRefinedPrompt(promptInfo.current_prompt);
      setNegativePrompt(promptInfo.negative_prompt);
      // 如果有九宫格选中的图片 seed，使用它
      if (promptInfo.selected_nine_grid_image?.seed) {
        setParams((prev) => ({
          ...prev,
          seed: promptInfo.selected_nine_grid_image!.seed,
        }));
      }
    }
  }, [promptInfo]);

  // 重置状态
  useEffect(() => {
    if (!open) {
      setRefinedImageUrl(null);
      setRefinedCompositionId(null);
    }
  }, [open]);

  // 生成微调图片
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/canvas/shot/${shotId}/refine-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refined_prompt: refinedPrompt,
          negative_prompt: negativePrompt,
          generation_params: params,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "生成失败");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setRefinedImageUrl(data.refined_image_url);
      setRefinedCompositionId(data.refined_composition_id);
      // 更新 seed 为实际使用的 seed
      if (data.seed) {
        setParams((prev) => ({ ...prev, seed: data.seed }));
      }
      toast.success("微调图片生成成功");
    },
    onError: (error) => {
      toast.error("生成失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    },
  });

  // 确认使用微调图片
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!refinedImageUrl) {
        throw new Error("请先生成微调图片");
      }

      const res = await fetch(`/api/canvas/shot/${shotId}/confirm-refined`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refined_image_url: refinedImageUrl,
          refined_composition_id: refinedCompositionId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "确认失败");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("已确认使用微调图片");
      queryClient.invalidateQueries({ queryKey: ["shot-detail"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("确认失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    },
  });

  // 重置 Prompt
  const handleReset = useCallback(() => {
    if (promptInfo) {
      setRefinedPrompt(promptInfo.current_prompt);
      setNegativePrompt(promptInfo.negative_prompt);
    }
  }, [promptInfo]);

  // 计算显示的图片
  const displayOriginalImage =
    originalImageUrl ||
    promptInfo?.current_image_url ||
    promptInfo?.selected_nine_grid_image?.image_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            Prompt 微调
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            编辑 Prompt 后重新生成图片，对比原图与微调后的效果
          </DialogDescription>
        </DialogHeader>

        {isLoadingPrompt ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            {/* 图片对比区域 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 原图 */}
              <div className="space-y-2">
                <Label className="text-zinc-400">原图</Label>
                <div className="aspect-[4/3] rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900">
                  {displayOriginalImage ? (
                    <img
                      src={displayOriginalImage}
                      alt="原图"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      无原图
                    </div>
                  )}
                </div>
              </div>

              {/* 微调后 */}
              <div className="space-y-2">
                <Label className="text-zinc-400">微调后</Label>
                <div className="aspect-[4/3] rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900">
                  {refinedImageUrl ? (
                    <img
                      src={refinedImageUrl}
                      alt="微调后"
                      className="w-full h-full object-cover"
                    />
                  ) : generateMutation.isPending ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-sm">生成中...</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                      <ArrowLeftRight className="w-8 h-8 mb-2" />
                      <span className="text-sm">编辑 Prompt 后点击生成</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Prompt 编辑区域 */}
            <ScrollArea className="h-[200px]">
              <div className="space-y-4 pr-4">
                {/* 正向 Prompt */}
                <div className="space-y-2">
                  <Label className="text-zinc-300">Prompt</Label>
                  <Textarea
                    value={refinedPrompt}
                    onChange={(e) => setRefinedPrompt(e.target.value)}
                    placeholder="输入图片生成 Prompt..."
                    className="min-h-[100px] bg-zinc-900 border-zinc-700 text-white resize-none"
                  />
                </div>

                {/* 负向 Prompt */}
                <div className="space-y-2">
                  <Label className="text-zinc-300">Negative Prompt</Label>
                  <Textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="输入不想出现的内容..."
                    className="min-h-[60px] bg-zinc-900 border-zinc-700 text-white resize-none"
                  />
                </div>

                {/* 高级参数 */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-white"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      高级参数
                      {showAdvanced ? (
                        <ChevronUp className="w-4 h-4 ml-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 ml-2" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-zinc-400">宽度</Label>
                        <Input
                          type="number"
                          value={params.width}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              width: parseInt(e.target.value) || 1024,
                            }))
                          }
                          className="h-8 bg-zinc-900 border-zinc-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-zinc-400">高度</Label>
                        <Input
                          type="number"
                          value={params.height}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              height: parseInt(e.target.value) || 768,
                            }))
                          }
                          className="h-8 bg-zinc-900 border-zinc-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-zinc-400">步数</Label>
                        <Input
                          type="number"
                          value={params.steps}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              steps: parseInt(e.target.value) || 30,
                            }))
                          }
                          className="h-8 bg-zinc-900 border-zinc-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-zinc-400">CFG Scale</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={params.cfg_scale}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              cfg_scale: parseFloat(e.target.value) || 7.5,
                            }))
                          }
                          className="h-8 bg-zinc-900 border-zinc-700"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs text-zinc-400">
                          Seed（留空随机）
                        </Label>
                        <Input
                          type="number"
                          value={params.seed ?? ""}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              seed: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            }))
                          }
                          placeholder="随机"
                          className="h-8 bg-zinc-900 border-zinc-700"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {/* 重置按钮 */}
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isLoadingPrompt || generateMutation.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            重置
          </Button>

          {/* 生成按钮 */}
          <Button
            variant={refinedImageUrl ? "outline" : "default"}
            onClick={() => generateMutation.mutate()}
            disabled={
              isLoadingPrompt ||
              generateMutation.isPending ||
              !refinedPrompt.trim()
            }
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {refinedImageUrl ? "重新生成" : "生成"}
              </>
            )}
          </Button>

          {/* 确认按钮 */}
          {refinedImageUrl && (
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  确认中...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  使用此图
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
