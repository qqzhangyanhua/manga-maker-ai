/**
 * AI 分镜优化建议弹窗组件
 *
 * 功能：
 * - 分析当前分镜
 * - 显示优化建议
 * - 一键应用优化
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
import { Progress } from "@/components/ui/progress";
import {
  Lightbulb,
  Loader2,
  Check,
  Camera,
  Maximize,
  LayoutGrid,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PanelOptimization {
  current_analysis: {
    strengths: string[];
    weaknesses: string[];
  };
  recommended_camera: {
    angle: string;
    angle_reason: string;
  };
  recommended_shot: {
    size: string;
    size_reason: string;
  };
  recommended_panel_type: {
    type: string;
    type_reason: string;
  };
  optimized_visual_prompt: string;
  composition_tips: string[];
  emotion_enhancement: string | null;
  current_score: number;
  potential_score: number;
}

interface OptimizationUpdates {
  camera_angle?: string;
  shot_size?: string;
  panel_type?: string;
  visual_prompt?: string;
}

interface OptimizationSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelId: string;
  currentPanel: {
    description: string;
    camera_angle: string | null;
    shot_size: string | null;
    panel_type: string;
  };
  onApply: (updates: OptimizationUpdates) => Promise<void>;
}

type FetchStatus = "idle" | "loading" | "success" | "error";

export default function OptimizationSuggestionDialog({
  open,
  onOpenChange,
  panelId,
  currentPanel,
  onApply,
}: OptimizationSuggestionDialogProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [optimization, setOptimization] = useState<PanelOptimization | null>(
    null
  );
  const [applying, setApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // 选择要应用的优化项
  const [selectedUpdates, setSelectedUpdates] = useState<{
    camera: boolean;
    shot: boolean;
    panelType: boolean;
    visualPrompt: boolean;
  }>({
    camera: true,
    shot: true,
    panelType: true,
    visualPrompt: true,
  });

  // 获取优化建议
  const fetchOptimization = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/panel/suggest-optimization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panel_id: panelId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "获取优化建议失败");
      }

      setOptimization(data.optimization);
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
  }, [panelId, toast]);

  // 打开时自动获取建议
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && status === "idle") {
      fetchOptimization();
    }
    if (!newOpen) {
      setStatus("idle");
      setOptimization(null);
      setSelectedUpdates({
        camera: true,
        shot: true,
        panelType: true,
        visualPrompt: true,
      });
    }
    onOpenChange(newOpen);
  };

  // 应用优化
  const handleApply = async () => {
    if (!optimization) return;

    const updates: OptimizationUpdates = {};
    if (selectedUpdates.camera) {
      updates.camera_angle = optimization.recommended_camera.angle;
    }
    if (selectedUpdates.shot) {
      updates.shot_size = optimization.recommended_shot.size;
    }
    if (selectedUpdates.panelType) {
      updates.panel_type = optimization.recommended_panel_type.type;
    }
    if (selectedUpdates.visualPrompt) {
      updates.visual_prompt = optimization.optimized_visual_prompt;
    }

    if (Object.keys(updates).length === 0) {
      toast({
        title: "请选择要应用的优化",
        variant: "destructive",
      });
      return;
    }

    setApplying(true);
    try {
      await onApply(updates);
      toast({
        title: "优化已应用",
        description: "分镜设置已更新",
      });
      handleOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "应用失败";
      toast({
        title: "应用失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const toggleUpdate = (key: keyof typeof selectedUpdates) => {
    setSelectedUpdates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            AI 优化建议
          </DialogTitle>
          <DialogDescription>
            AI 分析当前分镜，为您提供专业的优化建议
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* 加载中 */}
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                AI 正在分析分镜，生成优化建议...
              </p>
            </div>
          )}

          {/* 错误状态 */}
          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-destructive mb-4">{errorMessage}</p>
              <Button variant="outline" onClick={fetchOptimization}>
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
            </div>
          )}

          {/* 优化建议 */}
          {status === "success" && optimization && (
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-4">
                {/* 评分 */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">优化潜力评估</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        当前 {optimization.current_score}/10
                      </Badge>
                      <ArrowRight className="w-4 h-4" />
                      <Badge variant="default" className="bg-green-600">
                        优化后 {optimization.potential_score}/10
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12">
                        当前
                      </span>
                      <Progress
                        value={optimization.current_score * 10}
                        className="h-2 flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12">
                        优化后
                      </span>
                      <Progress
                        value={optimization.potential_score * 10}
                        className="h-2 flex-1 [&>div]:bg-green-600"
                      />
                    </div>
                  </div>
                </div>

                {/* 当前分析 */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <h4 className="text-sm font-medium mb-3">当前分镜分析</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                        <ThumbsUp className="w-3 h-3" />
                        优点
                      </div>
                      <ul className="space-y-1">
                        {optimization.current_analysis.strengths.map(
                          (s, i) => (
                            <li key={i} className="text-xs text-muted-foreground">
                              • {s}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs text-orange-600 mb-2">
                        <ThumbsDown className="w-3 h-3" />
                        可改进
                      </div>
                      <ul className="space-y-1">
                        {optimization.current_analysis.weaknesses.map(
                          (w, i) => (
                            <li key={i} className="text-xs text-muted-foreground">
                              • {w}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 镜头角度推荐 */}
                <OptimizationItem
                  icon={<Camera className="w-4 h-4" />}
                  title="镜头角度"
                  current={currentPanel.camera_angle || "未设定"}
                  recommended={optimization.recommended_camera.angle}
                  reason={optimization.recommended_camera.angle_reason}
                  selected={selectedUpdates.camera}
                  onToggle={() => toggleUpdate("camera")}
                />

                {/* 景别推荐 */}
                <OptimizationItem
                  icon={<Maximize className="w-4 h-4" />}
                  title="景别"
                  current={currentPanel.shot_size || "未设定"}
                  recommended={optimization.recommended_shot.size}
                  reason={optimization.recommended_shot.size_reason}
                  selected={selectedUpdates.shot}
                  onToggle={() => toggleUpdate("shot")}
                />

                {/* 分镜类型推荐 */}
                <OptimizationItem
                  icon={<LayoutGrid className="w-4 h-4" />}
                  title="分镜类型"
                  current={currentPanel.panel_type}
                  recommended={optimization.recommended_panel_type.type}
                  reason={optimization.recommended_panel_type.type_reason}
                  selected={selectedUpdates.panelType}
                  onToggle={() => toggleUpdate("panelType")}
                />

                {/* 视觉提示词优化 */}
                <div
                  className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedUpdates.visualPrompt
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                  onClick={() => toggleUpdate("visualPrompt")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        优化后的视觉提示词
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        selectedUpdates.visualPrompt
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {selectedUpdates.visualPrompt && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                    {optimization.optimized_visual_prompt}
                  </p>
                </div>

                {/* 构图建议 */}
                {optimization.composition_tips.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="text-sm font-medium mb-2">构图建议</h4>
                    <ul className="space-y-1">
                      {optimization.composition_tips.map((tip, i) => (
                        <li
                          key={i}
                          className="text-xs text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-primary">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 情绪增强建议 */}
                {optimization.emotion_enhancement && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="text-sm font-medium mb-2">情绪增强建议</h4>
                    <p className="text-xs text-muted-foreground">
                      {optimization.emotion_enhancement}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          {status === "success" && optimization && (
            <>
              <Button variant="outline" onClick={fetchOptimization}>
                <RefreshCw className="w-4 h-4 mr-2" />
                重新分析
              </Button>
              <Button onClick={handleApply} disabled={applying}>
                {applying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                应用选中的优化
              </Button>
            </>
          )}
          {status !== "success" && (
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              关闭
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 优化项组件
function OptimizationItem({
  icon,
  title,
  current,
  recommended,
  reason,
  selected,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  current: string;
  recommended: string;
  reason: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const isChanged = current !== recommended;

  return (
    <div
      className={`rounded-lg border p-4 cursor-pointer transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div
          className={`w-5 h-5 rounded border flex items-center justify-center ${
            selected
              ? "bg-primary border-primary"
              : "border-muted-foreground"
          }`}
        >
          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline" className="text-xs">
          {current}
        </Badge>
        {isChanged && (
          <>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <Badge variant="default" className="text-xs bg-green-600">
              {recommended}
            </Badge>
          </>
        )}
        {!isChanged && (
          <span className="text-xs text-muted-foreground">(已是最佳)</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">{reason}</p>
    </div>
  );
}
