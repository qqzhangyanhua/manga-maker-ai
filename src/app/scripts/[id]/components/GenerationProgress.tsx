/**
 * Generation Progress Display Component
 * Shows real-time progress for streaming panel generation
 */

import { useState } from "react";
import { Loader2, X, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ProgressState } from "../hooks/useStreamingGeneration";

interface GenerationProgressProps {
  progress: ProgressState;
  onCancel: () => void;
}

export function GenerationProgress({ progress, onCancel }: GenerationProgressProps) {
  const { stage, current, total, message, llmContent } = progress;
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if idle or done
  if (stage === "idle" || stage === "done") {
    return null;
  }

  const percentage = total > 0 ? (current / total) * 100 : 0;

  // Get stage icon and color
  const getStageInfo = () => {
    switch (stage) {
      case "validating":
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin text-blue-500" />,
          color: "border-blue-500",
        };
      case "generating":
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin text-purple-500" />,
          color: "border-purple-500",
        };
      case "saving":
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin text-green-500" />,
          color: "border-green-500",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-5 h-5 text-destructive" />,
          color: "border-destructive",
        };
      default:
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          color: "border-primary",
        };
    }
  };

  const stageInfo = getStageInfo();

  // 是否显示 LLM 内容预览
  const showLlmPreview = stage === "generating" && llmContent && llmContent.length > 0;

  return (
    <div
      className={`fixed bottom-6 right-6 ${
        isExpanded && showLlmPreview ? "w-[500px]" : "w-96"
      } bg-card border-2 ${stageInfo.color} rounded-lg shadow-2xl p-5 z-50 animate-in slide-in-from-bottom-5 duration-300 transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {stageInfo.icon}
          <div>
            <h3 className="font-semibold text-base">
              {stage === "error" ? "生成失败" : "AI 分镜生成中"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stage === "validating" && "验证中"}
              {stage === "generating" && "AI 生成中"}
              {stage === "saving" && "保存中"}
              {stage === "error" && "发生错误"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="h-8 w-8 hover:bg-destructive/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Message */}
      <p className="text-sm text-muted-foreground mb-4 min-h-[20px]">{message}</p>

      {/* Progress Bar (only show if not error) */}
      {stage !== "error" && (
        <>
          <Progress value={percentage} className="h-2 mb-2" />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              步骤 {current} / {total}
            </span>
            <span>{Math.round(percentage)}%</span>
          </div>
        </>
      )}

      {/* Error state action */}
      {stage === "error" && (
        <Button variant="outline" size="sm" onClick={onCancel} className="w-full mt-2">
          关闭
        </Button>
      )}

      {/* LLM Content Preview */}
      {showLlmPreview && (
        <div className="mt-4 border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-xs mb-2"
          >
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              AI 生成预览
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {isExpanded && (
            <div className="bg-muted/50 rounded p-3 max-h-60 overflow-y-auto text-xs font-mono leading-relaxed whitespace-pre-wrap">
              {llmContent}
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
