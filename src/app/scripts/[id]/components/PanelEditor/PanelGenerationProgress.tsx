/**
 * 分镜图片生成进度组件
 * 显示生成状态、进度条和错误信息
 */

"use client";

import { Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { GenerationTask } from "../../types/script-editor.types";

interface PanelGenerationProgressProps {
  task: GenerationTask;
  onRetry?: () => void;
  onCancel?: () => void;
}

export function PanelGenerationProgress({
  task,
  onRetry,
  onCancel,
}: PanelGenerationProgressProps) {
  const { status, progress, error } = task;

  return (
    <div className="mt-3 p-3 bg-muted/30 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === "pending" && (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">等待生成...</span>
            </>
          )}
          {status === "processing" && (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium">
                生成中... {progress}%
              </span>
            </>
          )}
          {status === "completed" && (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                生成完成
              </span>
            </>
          )}
          {status === "failed" && (
            <>
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                生成失败
              </span>
            </>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {status === "failed" && onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-7"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              重试
            </Button>
          )}
          {(status === "pending" || status === "processing") && onCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="h-7 text-xs"
            >
              取消
            </Button>
          )}
        </div>
      </div>

      {/* 进度条 */}
      {(status === "pending" || status === "processing") && (
        <Progress value={progress} className="h-1" />
      )}

      {/* 错误信息 */}
      {status === "failed" && error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
