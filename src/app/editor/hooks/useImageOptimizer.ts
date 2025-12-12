import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { EditorVersion } from "@/components/ImageEditor/VersionTimeline";
import { CanvasController } from "@/components/ImageEditor/CanvasWorkspace";
import { ApiVersion, normalizeVersion } from "../types";

const pollTaskStatus = async (taskId: string, attempt = 0): Promise<{ imageUrl?: string }> => {
  if (attempt > 60) {
    throw new Error("AI 优化超时，请稍后重试");
  }

  await new Promise((resolve) => setTimeout(resolve, Math.min(2000 + attempt * 200, 5000)));
  const res = await fetch(`/api/image/task-status?task_id=${taskId}`);

  if (!res.ok) {
    throw new Error("查询任务状态失败");
  }

  const data = await res.json();

  if (data.status === "completed") {
    return data;
  }

  if (data.status === "failed") {
    throw new Error(data.error || "AI 优化失败");
  }

  return pollTaskStatus(taskId, attempt + 1);
};

type UseImageOptimizerOptions = {
  currentImage: string | null;
  activeVersion: string | null;
  canvasController: React.MutableRefObject<CanvasController | null>;
  onVersionsUpdate: (updater: (prev: EditorVersion[]) => EditorVersion[]) => void;
  onActiveVersionChange: (id: string) => void;
  onLoadingVersionChange: (id: string | null) => void;
  updateVersionRecord: (id: string, payload: Record<string, unknown>) => Promise<EditorVersion>;
};

export const useImageOptimizer = ({
  currentImage,
  activeVersion,
  canvasController,
  onVersionsUpdate,
  onActiveVersionChange,
  onLoadingVersionChange,
  updateVersionRecord,
}: UseImageOptimizerOptions) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  const handleOptimize = useCallback(
    async ({ prompt, style, strength }: { prompt: string; style: string; strength: number }) => {
      if (!currentImage) {
        toast({ title: "请先选择或上传一张图片", variant: "destructive" });
        return;
      }

      const previousActive = activeVersion;
      let pendingVersionId: string | null = null;
      let taskId: string | null = null;
      setIsOptimizing(true);

      try {
        const currentSchema = canvasController.current?.exportSchema();
        const response = await fetch("/api/image/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            style,
            strength,
            imageUrl: currentImage,
            versionId: activeVersion,
            canvasSchema: currentSchema,
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result?.error || "AI 优化请求失败");
        }

        if (!result.version || !result.taskId) {
          throw new Error("AI 优化返回数据异常");
        }

        taskId = result.taskId;
        const versionFromApi = normalizeVersion(result.version as ApiVersion);
        pendingVersionId = versionFromApi.id;

        onVersionsUpdate((prev) => [versionFromApi, ...prev]);
        onActiveVersionChange(versionFromApi.id);
        onLoadingVersionChange(versionFromApi.id);

        toast({ title: "已提交 AI 优化", description: "可继续拖拽分格，完成后自动更新" });

        const taskResult = await pollTaskStatus(taskId);
        const optimizedImage = taskResult.imageUrl || currentImage;

        const updatedVersion = await updateVersionRecord(versionFromApi.id, {
          status: "completed",
          imageUrl: optimizedImage,
        }).catch(() => null);

        onVersionsUpdate((prev) =>
          prev.map((version) =>
            version.id === versionFromApi.id
              ? {
                  ...version,
                  status: "completed" as const,
                  thumbnail: optimizedImage,
                  createdAt: new Date(),
                }
              : version
          )
        );
        if (updatedVersion) {
          onVersionsUpdate((prev) =>
            prev.map((version) => (version.id === updatedVersion.id ? updatedVersion : version))
          );
        }

        onLoadingVersionChange(null);
        await canvasController.current?.setBackgroundImage(optimizedImage);
        toast({
          title: "AI 优化完成",
          description: `效果已更新（强度 ${strength}%）`,
        });
      } catch (error: unknown) {
        console.error("AI 优化失败:", error);
        if (pendingVersionId) {
          let updatedFailedVersion: EditorVersion | null = null;
          try {
            updatedFailedVersion = await updateVersionRecord(pendingVersionId, {
              status: "failed",
            });
          } catch {
            updatedFailedVersion = null;
          }
          onVersionsUpdate((prev) =>
            prev.map((version) =>
              version.id === pendingVersionId
                ? updatedFailedVersion ?? { ...version, status: "failed" as const }
                : version
            )
          );
          if (previousActive) {
            onActiveVersionChange(previousActive);
          }
        }
        // Clear loading state if it was for the failed version
        if (pendingVersionId) {
          onLoadingVersionChange(null);
        }
        const message = error instanceof Error ? error.message : "请稍后再试";
        toast({
          title: "AI 优化失败",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsOptimizing(false);
      }
    },
    [
      currentImage,
      activeVersion,
      canvasController,
      onVersionsUpdate,
      onActiveVersionChange,
      onLoadingVersionChange,
      updateVersionRecord,
      toast,
    ]
  );

  return {
    isOptimizing,
    handleOptimize,
  };
};
