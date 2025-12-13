/**
 * 分镜图片生成 Hook
 * 处理单个和批量图片生成，以及任务状态轮询
 */

import { useState, useCallback, useRef } from "react";
import type { GenerationTask, TaskStatusResponse } from "../types/script-editor.types";
import { usePanelGenerationDedup } from "./useDedupedRequest";

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
  const { generateImage: dedupedGenerateImage } = usePanelGenerationDedup();

  /**
   * 根据任务状态动态调整轮询间隔
   */
  const getPollingInterval = useCallback((status: string, retryCount: number): number => {
    switch (status) {
      case 'pending':
        return 5000; // 等待中,5秒轮询
      case 'processing':
        return 2000; // 处理中,2秒轮询
      default:
        // 失败时使用指数退避
        return Math.min(10000, 2000 * Math.pow(2, retryCount));
    }
  }, []);

  /**
   * 开始智能轮询任务状态
   */
  const startPolling = useCallback(
    (panelId: string, taskId: string) => {
      // 清除已存在的轮询
      const existingInterval = pollIntervalsRef.current.get(panelId);
      if (existingInterval) {
        clearTimeout(existingInterval);
      }

      let retryCount = 0;
      const maxRetries = 3;

      const poll = async () => {
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

          // 根据状态决定下一步
          if (status.status === "completed") {
            pollIntervalsRef.current.delete(panelId);
            if (status.imageUrl) {
              onSuccess?.(panelId, status.imageUrl);
            }
          } else if (status.status === "failed") {
            pollIntervalsRef.current.delete(panelId);
            onError?.(panelId, status.error || "生成失败");
          } else {
            // 继续轮询,动态调整间隔
            const interval = getPollingInterval(status.status, retryCount);
            const timeoutId = setTimeout(poll, interval);
            pollIntervalsRef.current.set(panelId, timeoutId);
          }
        } catch (error) {
          console.error("Polling error:", error);
          retryCount++;
          
          if (retryCount >= maxRetries) {
            // 超过最大重试次数,停止轮询
            pollIntervalsRef.current.delete(panelId);
            onError?.(panelId, "轮询超时,请刷新页面重试");
          } else {
            // 继续重试,使用指数退避
            const interval = getPollingInterval('error', retryCount);
            const timeoutId = setTimeout(poll, interval);
            pollIntervalsRef.current.set(panelId, timeoutId);
          }
        }
      };

      // 开始首次轮询
      poll();
    },
    [onSuccess, onError, getPollingInterval]
  );

  /**
   * 生成单个分镜图片
   * 直接等待后端返回结果（完全同步）
   */
  const generateSingle = useCallback(
    async (panelId: string, prompt: string) => {
      try {
        // 初始化任务状态
        setGeneratingPanels((prev) => {
          const newMap = new Map(prev);
          newMap.set(panelId, {
            panelId,
            taskId: "",
            status: "processing",
            progress: 50, // 显示处理中
          });
          return newMap;
        });

        // 调用生成接口（后端会同步等待完成并返回图片URL）
        const data = await dedupedGenerateImage(panelId, prompt);

        // 检查返回的数据
        if (data.success && data.image_url) {
          // 生成成功
          setGeneratingPanels((prev) => {
            const newMap = new Map(prev);
            newMap.set(panelId, {
              panelId,
              taskId: "",
              status: "completed",
              progress: 100,
              imageUrl: data.image_url,
            });
            return newMap;
          });
          onSuccess?.(panelId, data.image_url);
        } else {
          // 生成失败
          throw new Error(data.error || "生成失败：未返回图片URL");
        }

        return panelId;
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
    [onSuccess, onError, dedupedGenerateImage]
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
    const timeoutId = pollIntervalsRef.current.get(panelId);
    if (timeoutId) {
      clearTimeout(timeoutId);
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
