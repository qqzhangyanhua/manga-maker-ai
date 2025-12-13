/**
 * AI 续写建议弹窗组件
 *
 * 功能：
 * - 获取 AI 续写建议
 * - 显示建议列表
 * - 一键采纳建议
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  Check,
  Camera,
  MessageSquare,
  Smile,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PanelSuggestion {
  description: string;
  visual_prompt: string;
  dialogue: string | null;
  emotion: string | null;
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  reasoning: string;
}

interface ContinuationSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  afterPanelId?: string;
  onAdopt: (suggestion: PanelSuggestion) => Promise<void>;
}

type FetchStatus = "idle" | "loading" | "success" | "error";

export default function ContinuationSuggestionDialog({
  open,
  onOpenChange,
  projectId,
  afterPanelId,
  onAdopt,
}: ContinuationSuggestionDialogProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [suggestions, setSuggestions] = useState<PanelSuggestion[]>([]);
  const [adoptingIndex, setAdoptingIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // 获取建议
  const fetchSuggestions = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/panel/suggest-continuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          after_panel_id: afterPanelId,
          count: 3,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "获取建议失败");
      }

      setSuggestions(data.suggestions || []);
      setStatus("success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      setErrorMessage(message);
      setStatus("error");
      toast({
        title: "获取建议失败",
        description: message,
        variant: "destructive",
      });
    }
  }, [projectId, afterPanelId, toast]);

  // 打开时自动获取建议
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && status === "idle") {
      fetchSuggestions();
    }
    if (!newOpen) {
      // 重置状态
      setStatus("idle");
      setSuggestions([]);
      setAdoptingIndex(null);
    }
    onOpenChange(newOpen);
  };

  // 采纳建议
  const handleAdopt = async (suggestion: PanelSuggestion, index: number) => {
    setAdoptingIndex(index);
    try {
      await onAdopt(suggestion);
      toast({
        title: "已采纳建议",
        description: "新分镜已添加",
      });
      handleOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "采纳失败";
      toast({
        title: "采纳失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAdoptingIndex(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI 续写建议
          </DialogTitle>
          <DialogDescription>
            AI 基于当前故事上下文，为您建议下一个分镜内容
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* 加载中 */}
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                AI 正在分析故事脉络，生成建议中...
              </p>
            </div>
          )}

          {/* 错误状态 */}
          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-destructive mb-4">{errorMessage}</p>
              <Button variant="outline" onClick={fetchSuggestions}>
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
            </div>
          )}

          {/* 建议列表 */}
          {status === "success" && suggestions.length > 0 && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-border bg-card p-4 space-y-3"
                  >
                    {/* 建议编号和描述 */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">建议 {index + 1}</Badge>
                          <Badge variant="outline">{suggestion.panel_type}</Badge>
                        </div>
                        <p className="text-sm font-medium">
                          {suggestion.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAdopt(suggestion, index)}
                        disabled={adoptingIndex !== null}
                      >
                        {adoptingIndex === index ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            采纳
                          </>
                        )}
                      </Button>
                    </div>

                    {/* 详细信息 */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Camera className="w-3 h-3" />
                        {suggestion.camera_angle} / {suggestion.shot_size}
                      </div>
                      {suggestion.emotion && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Smile className="w-3 h-3" />
                          {suggestion.emotion}
                        </div>
                      )}
                    </div>

                    {/* 对话 */}
                    {suggestion.dialogue && (
                      <div className="flex items-start gap-2 text-sm bg-muted/50 rounded p-2">
                        <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        <p className="italic">&ldquo;{suggestion.dialogue}&rdquo;</p>
                      </div>
                    )}

                    {/* 视觉提示词 */}
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                      <span className="font-medium">Visual: </span>
                      {suggestion.visual_prompt}
                    </div>

                    {/* 推荐理由 */}
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      <span className="font-medium">推荐理由: </span>
                      {suggestion.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* 无建议 */}
          {status === "success" && suggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground mb-4">
                暂无建议，请确保项目有足够的分镜上下文
              </p>
              <Button variant="outline" onClick={fetchSuggestions}>
                <RefreshCw className="w-4 h-4 mr-2" />
                重新生成
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          {status === "success" && suggestions.length > 0 && (
            <Button variant="outline" onClick={fetchSuggestions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              换一批
            </Button>
          )}
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
