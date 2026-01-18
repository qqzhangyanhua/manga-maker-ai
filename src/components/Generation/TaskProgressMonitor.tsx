"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  X
} from "lucide-react";
import { GenerationTask, SuccessResponse } from "@/types/template";
import { cn } from "@/lib/utils";

interface TaskProgressMonitorProps {
  taskId: string;
  onComplete?: (task: GenerationTask) => void;
  onCancel?: () => void;
}

export function TaskProgressMonitor({
  taskId,
  onComplete,
  onCancel
}: TaskProgressMonitorProps) {
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);

  // Poll task status every 2 seconds
  const { data, isLoading } = useQuery({
    queryKey: ["generation-task", taskId],
    queryFn: async () => {
      const response = await fetch(`/api/generation-tasks/${taskId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch task status");
      }
      const json: SuccessResponse<{ task: GenerationTask & { project: { id: string; title: string } } }> = await response.json();
      return json.data.task;
    },
    refetchInterval: (query) => {
      // Stop polling if task is completed, failed, or cancelled
      const data = query.state.data;
      if (!data) return 2000;
      const status = data.status;
      return ["completed", "failed", "cancelled"].includes(status) ? false : 2000;
    }
  });

  // Call onComplete when task finishes
  useEffect(() => {
    if (data && data.status === "completed" && onComplete) {
      onComplete(data);
    }
  }, [data, onComplete]);

  const handleCancel = async () => {
    if (!data || data.status !== "processing" && data.status !== "pending") {
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch(`/api/generation-tasks/${taskId}/cancel`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Failed to cancel task");
      }

      // Refresh task data
      queryClient.invalidateQueries({ queryKey: ["generation-task", taskId] });
      onCancel?.();
    } catch (error) {
      console.error("Failed to cancel task:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const task = data;
  const statusIcons = {
    pending: Clock,
    processing: Loader2,
    completed: CheckCircle2,
    failed: XCircle,
    cancelled: AlertTriangle
  };

  const statusColors = {
    pending: "text-gray-500",
    processing: "text-blue-500",
    completed: "text-green-500",
    failed: "text-red-500",
    cancelled: "text-yellow-500"
  };

  const statusLabels = {
    pending: "等待中",
    processing: "生成中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消"
  };

  const StatusIcon = statusIcons[task.status as keyof typeof statusIcons];
  const statusColor = statusColors[task.status as keyof typeof statusColors];
  const statusLabel = statusLabels[task.status as keyof typeof statusLabels];

  const panelCount = task.panel_ids.length;
  const currentIndex = task.current_panel_index;
  const progress = task.progress;
  const taskSettings = task.settings as { quality?: string; failureMode?: string } | null;
  const errorLogs = Array.isArray(task.error_logs)
    ? (task.error_logs as Array<{ error?: string }>)
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className={cn("h-5 w-5", statusColor, task.status === "processing" && "animate-spin")} />
              批量生成任务
            </CardTitle>
            <CardDescription>
              项目: {task.project.title}
            </CardDescription>
          </div>
          <Badge variant={task.status === "completed" ? "default" : "secondary"}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar */}
        {(task.status === "processing" || task.status === "pending") && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                进度: {currentIndex} / {panelCount}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">总数</p>
            <p className="text-lg font-semibold">{panelCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">已完成</p>
            <p className="text-lg font-semibold">{currentIndex}</p>
          </div>
          <div>
            <p className="text-muted-foreground">剩余</p>
            <p className="text-lg font-semibold">{panelCount - currentIndex}</p>
          </div>
        </div>

        {/* Settings info */}
        <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">任务类型:</span>
            <span className="font-medium">{task.task_type === "batch" ? "批量生成" : "变体生成"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">质量:</span>
            <span className="font-medium">
              {taskSettings?.quality === "high" ? "高质量" : "标准质量"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">失败处理:</span>
            <span className="font-medium">
              {taskSettings?.failureMode === "stop" ? "停止任务" : "跳过失败项"}
            </span>
          </div>
        </div>

        {/* Error logs */}
        {errorLogs.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">遇到 {errorLogs.length} 个错误:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {errorLogs.slice(0, 3).map((log, index) => (
                  <li key={index}>{log.error ?? "未知错误"}</li>
                ))}
                {errorLogs.length > 3 && (
                  <li>还有 {errorLogs.length - 3} 个错误...</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        {(task.status === "processing" || task.status === "pending") && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                取消中...
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                取消任务
              </>
            )}
          </Button>
        )}

        {/* Completion info */}
        {task.status === "completed" && task.completed_at && (
          <Alert className="bg-green-500/10 border-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-sm">
              任务已完成! 共生成 {panelCount} 张图片。
            </AlertDescription>
          </Alert>
        )}

        {task.status === "failed" && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              任务失败。请检查错误日志或重试。
            </AlertDescription>
          </Alert>
        )}

        {task.status === "cancelled" && (
          <Alert className="bg-yellow-500/10 border-yellow-500/20">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-sm">
              任务已取消。已完成 {currentIndex} / {panelCount} 张图片。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
