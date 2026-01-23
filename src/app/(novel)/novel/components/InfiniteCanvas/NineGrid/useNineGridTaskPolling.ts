/**
 * 九宫格任务状态轮询 Hook
 */

import { useEffect, useState, useCallback, useRef } from "react";

export interface NineGridTaskStatus {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  imageUrl?: string;
  error?: string;
}

interface UseNineGridTaskPollingOptions {
  taskId: string | null;
  enabled?: boolean;
  interval?: number;
  maxAttempts?: number; // 最大轮询次数
  onComplete?: (result: NineGridTaskStatus) => void;
  onError?: (error: string) => void;
}

/**
 * 轮询九宫格任务状态
 */
export function useNineGridTaskPolling({
  taskId,
  enabled = true,
  interval = 5000,
  maxAttempts = 60, // 默认最多轮询 60 次（5分钟）
  onComplete,
  onError,
}: UseNineGridTaskPollingOptions) {
  const [status, setStatus] = useState<NineGridTaskStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const attemptsRef = useRef(0);

  // 使用 ref 存储回调函数，避免作为 useEffect 依赖项
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // 更新 ref
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  const fetchStatus = useCallback(async () => {
    if (!taskId) return null;

    try {
      const response = await fetch(
        `/api/canvas/nine-grid/generate?taskId=${taskId}`
      );
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || "查询任务状态失败");
      }
      return (await response.json()) as NineGridTaskStatus;
    } catch (err) {
      console.error("[NineGridPolling] Error:", err);
      throw err; // 抛出错误，让调用者处理
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId || !enabled) {
      setIsPolling(false);
      attemptsRef.current = 0;
      return;
    }

    setIsPolling(true);
    attemptsRef.current = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const poll = async () => {
      if (isCancelled) return;

      // 检查是否超过最大轮询次数
      attemptsRef.current += 1;
      if (attemptsRef.current > maxAttempts) {
        setIsPolling(false);
        onErrorRef.current?.("生成超时，请稍后查看任务状态");
        return;
      }

      try {
        const result = await fetchStatus();
        if (isCancelled || !result) return;

        setStatus(result);

        if (result.status === "completed") {
          setIsPolling(false);
          onCompleteRef.current?.(result);
        } else if (result.status === "failed") {
          setIsPolling(false);
          onErrorRef.current?.(result.error || "生成失败");
        } else {
          // 状态为 pending 或 processing，继续轮询
          timeoutId = setTimeout(poll, interval);
        }
      } catch (err) {
        // API 返回错误（如 404），停止轮询
        if (isCancelled) return;
        setIsPolling(false);
        const errorMessage = err instanceof Error ? err.message : "查询任务状态失败";
        onErrorRef.current?.(errorMessage);
      }
    };

    poll();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [taskId, enabled, interval, maxAttempts, fetchStatus]); // 移除 onComplete 和 onError

  const reset = useCallback(() => {
    setStatus(null);
    setIsPolling(false);
    attemptsRef.current = 0;
  }, []);

  return {
    status,
    isPolling,
    reset,
  };
}
