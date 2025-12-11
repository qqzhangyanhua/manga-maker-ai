/**
 * 分镜图片生成 Hook
 * 处理单个和批量图片生成，以及任务状态轮询
 */

import { useState, useCallback, useRef } from "react";
import type { GenerationTask, TaskStatusResponse } from "../types/script-editor.types";

interface UsePanelGenerationProps {
  onSuccess?: (panelId: string, imageUrl: string) => void;
  onError?: (panelId: string, error: string) => void;
}

export function usePanelGeneration({
  onSuccess,
  onError,
}: UsePanelGenerationProps = {}) {
  const [generatingPanels, setGeneratingPanels] = useState<
    Map<string, GenerationTask>
  >(new Map());

  const pollIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * 开始轮询任务状态
   */
  const startPolling = useCallback(
    (panelId: string, taskId: string) => {
      // 清除已存在的轮询
      const existingInterval = pollIntervalsRef.current.get(panelId);
      if (existingInterval) {
        clearInterval(existingInterval);
      }

      const interval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/panel/generate-image/status?task_id=${taskId}`
          );

          if (!response.ok) {
            throw new Error("Failed to fetch status");
          }

          const status: TaskStatusResponse = await response.json();

          setGeneratingPanels((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(panelId);
            if (existing) {
              newMap.set(panelId, {
                ...existing,
                status: status.status,
                progress: status.progress,
                imageUrl: status.imageUrl,
                error: status.error,
              });
            }
            return newMap;
          });

          // 如果任务完成或失败，停止轮询
          if (status.status === "completed" || status.status === "failed") {
            clearInterval(interval);
            pollIntervalsRef.current.delete(panelId);

            if (status.status === "completed" && status.imageUrl) {
              onSuccess?.(panelId, status.imageUrl);
            } else if (status.status === "failed") {
              onError?.(panelId, status.error || "生成失败");
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
          // 继续轮询，不终止
        }
      }, 2000); // 每 2 秒轮询一次

      pollIntervalsRef.current.set(panelId, interval);
    },
    [onSuccess, onError]
  );

  /**
   * 生成单个分镜图片
   */
  const generateSingle = useCallback(
    async (panelId: string, prompt: string, wait = false) => {
      try {
        // 初始化任务状态
        setGeneratingPanels((prev) => {
          const newMap = new Map(prev);
          newMap.set(panelId, {
            panelId,
            taskId: "",
            status: "pending",
            progress: 0,
          });
          return newMap;
        });

        const response = await fetch("/api/panel/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ panel_id: panelId, prompt, wait }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "生成失败");
        }

        const data = await response.json();

        // 如果等待模式且已完成
        if (wait && data.image_url) {
          setGeneratingPanels((prev) => {
            const newMap = new Map(prev);
            newMap.set(panelId, {
              panelId,
              taskId: data.task_id || "",
              status: "completed",
              progress: 100,
              imageUrl: data.image_url,
            });
            return newMap;
          });
          onSuccess?.(panelId, data.image_url);
        } else {
          // 异步模式：开始轮询
          setGeneratingPanels((prev) => {
            const newMap = new Map(prev);
            newMap.set(panelId, {
              panelId,
              taskId: data.task_id,
              status: "processing",
              progress: 10,
            });
            return newMap;
          });
          startPolling(panelId, data.task_id);
        }

        return data.task_id;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "生成失败";

        setGeneratingPanels((prev) => {
          const newMap = new Map(prev);
          newMap.set(panelId, {
            panelId,
            taskId: "",
            status: "failed",
            progress: 0,
            error: errorMsg,
          });
          return newMap;
        });

        onError?.(panelId, errorMsg);
        throw error;
      }
    },
    [onSuccess, onError, startPolling]
  );

  /**
   * 批量生成分镜图片
   */
  const generateBatch = useCallback(
    async (projectId: string) => {
      try {
        const response = await fetch("/api/panel/generate-image", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "批量生成失败");
        }

        const data = await response.json();

        // 为每个任务开始轮询
        if (data.task_ids && Array.isArray(data.task_ids)) {
          data.task_ids.forEach((taskId: string, index: number) => {
            // Note: 需要从响应中获取 panelId，这里假设顺序一致
            // 实际应该从后端返回 panelId 映射
            const panelId = `panel-${index}`;
            setGeneratingPanels((prev) => {
              const newMap = new Map(prev);
              newMap.set(panelId, {
                panelId,
                taskId,
                status: "processing",
                progress: 10,
              });
              return newMap;
            });
            startPolling(panelId, taskId);
          });
        }

        return data.task_ids;
      } catch (error) {
        throw error;
      }
    },
    [startPolling]
  );

  /**
   * 停止轮询
   */
  const stopPolling = useCallback((panelId: string) => {
    const interval = pollIntervalsRef.current.get(panelId);
    if (interval) {
      clearInterval(interval);
      pollIntervalsRef.current.delete(panelId);
    }
  }, []);

  /**
   * 清除任务状态
   */
  const clearTask = useCallback((panelId: string) => {
    stopPolling(panelId);
    setGeneratingPanels((prev) => {
      const newMap = new Map(prev);
      newMap.delete(panelId);
      return newMap;
    });
  }, [stopPolling]);

  /**
   * 重试失败的任务
   */
  const retry = useCallback(
    async (panelId: string, prompt: string) => {
      clearTask(panelId);
      await generateSingle(panelId, prompt);
    },
    [clearTask, generateSingle]
  );

  return {
    generatingPanels,
    generateSingle,
    generateBatch,
    stopPolling,
    clearTask,
    retry,
  };
}
