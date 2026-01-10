/**
 * usePanelEstimation - 章节镜头数量预估 Hook
 *
 * 功能：
 * 1. 快速获取章节预估镜头数
 * 2. 支持不同密度模式切换
 * 3. 自动处理加载状态和错误
 */

import { useState, useEffect } from "react";
import type { PanelEstimation, DensityMode } from "../types";

interface UsePanelEstimationParams {
  chapterId: string | null;
  densityMode?: DensityMode;
  autoFetch?: boolean; // 是否自动获取（默认 true）
}

interface UsePanelEstimationResult {
  estimation: PanelEstimation | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 获取章节镜头数量预估
 */
export function usePanelEstimation(
  params: UsePanelEstimationParams
): UsePanelEstimationResult {
  const { chapterId, densityMode = "standard", autoFetch = true } = params;

  const [estimation, setEstimation] = useState<PanelEstimation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimation = async () => {
    if (!chapterId) {
      setEstimation(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/chapter/${chapterId}/estimate-panels?densityMode=${densityMode}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "获取预估失败");
      }

      const data: PanelEstimation = await response.json();
      setEstimation(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误";
      setError(message);
      console.error("Failed to fetch panel estimation:", err);
    } finally {
      setLoading(false);
    }
  };

  // 自动获取
  useEffect(() => {
    if (autoFetch && chapterId) {
      fetchEstimation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, densityMode, autoFetch]);

  return {
    estimation,
    loading,
    error,
    refetch: fetchEstimation,
  };
}
