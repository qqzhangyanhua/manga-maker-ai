/**
 * Panel Inline 更新 Hook
 * 封装单字段更新 API 调用
 */

import { useCallback } from "react";

interface UsePanelInlineUpdateOptions {
  /** 更新成功后的回调 */
  onSuccess?: () => void;
}

export function usePanelInlineUpdate(options: UsePanelInlineUpdateOptions = {}) {
  const { onSuccess } = options;

  /**
   * 更新分镜的单个字段
   */
  const updatePanelField = useCallback(
    async (panelId: string, field: string, value: string) => {
      const response = await fetch(`/api/panel/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "更新失败");
      }

      onSuccess?.();
    },
    [onSuccess]
  );

  /**
   * 批量更新分镜字段
   */
  const updatePanelFields = useCallback(
    async (panelId: string, updates: Record<string, string>) => {
      const response = await fetch(`/api/panel/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "更新失败");
      }

      onSuccess?.();
    },
    [onSuccess]
  );

  return {
    updatePanelField,
    updatePanelFields,
  };
}
