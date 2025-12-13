/**
 * 批量操作 Hook
 *
 * 提供批量更新分镜的 API 调用封装
 */

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BatchOperationLoadingState } from "@/types/batch-selection";

interface BatchUpdateParams {
  panelIds: string[];
  updates: Record<string, string | undefined>;
}

interface BatchUpdateResponse {
  success: boolean;
  data?: {
    updatedCount: number;
    panels: unknown[];
    appliedUpdates: Record<string, string>;
  };
  message?: string;
  error?: string;
}

export function useBatchOperations() {
  const { toast } = useToast();
  const [operationLoading, setOperationLoading] =
    useState<BatchOperationLoadingState>({
      type: null,
      isLoading: false,
    });

  /**
   * 批量更新分镜属性
   */
  const batchUpdatePanels = useCallback(
    async (params: BatchUpdateParams): Promise<boolean> => {
      const { panelIds, updates } = params;

      if (panelIds.length === 0) {
        toast({
          title: "操作失败",
          description: "请先选择要修改的分镜",
          variant: "destructive",
        });
        return false;
      }

      // 过滤掉空值
      const cleanUpdates: Record<string, string> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null && value !== "") {
          cleanUpdates[key] = value;
        }
      }

      if (Object.keys(cleanUpdates).length === 0) {
        toast({
          title: "操作失败",
          description: "请至少选择一项要修改的属性",
          variant: "destructive",
        });
        return false;
      }

      try {
        const response = await fetch("/api/panel/batch-update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            panelIds,
            updates: cleanUpdates,
          }),
        });

        const data: BatchUpdateResponse = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "批量更新失败");
        }

        toast({
          title: "修改成功",
          description: data.message || `已更新 ${panelIds.length} 个分镜`,
        });

        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "未知错误";
        toast({
          title: "操作失败",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  /**
   * 批量更新镜头设置
   */
  const batchUpdateCamera = useCallback(
    async (
      panelIds: string[],
      updates: {
        camera_angle?: string;
        shot_size?: string;
        panel_type?: string;
      }
    ): Promise<boolean> => {
      setOperationLoading({ type: "update_camera", isLoading: true });
      try {
        return await batchUpdatePanels({ panelIds, updates });
      } finally {
        setOperationLoading({ type: null, isLoading: false });
      }
    },
    [batchUpdatePanels]
  );

  /**
   * 批量更新角色
   */
  const batchUpdateCharacter = useCallback(
    async (
      panelIds: string[],
      updates: {
        character_id?: string;
        expression_type?: string;
        outfit_id?: string;
      }
    ): Promise<boolean> => {
      setOperationLoading({ type: "update_character", isLoading: true });
      try {
        return await batchUpdatePanels({ panelIds, updates });
      } finally {
        setOperationLoading({ type: null, isLoading: false });
      }
    },
    [batchUpdatePanels]
  );

  /**
   * 批量更新风格/重要性
   */
  const batchUpdateStyle = useCallback(
    async (
      panelIds: string[],
      updates: {
        importance?: string;
        scene_id?: string;
      }
    ): Promise<boolean> => {
      setOperationLoading({ type: "update_style", isLoading: true });
      try {
        return await batchUpdatePanels({ panelIds, updates });
      } finally {
        setOperationLoading({ type: null, isLoading: false });
      }
    },
    [batchUpdatePanels]
  );

  /**
   * 批量删除分镜
   */
  const batchDeletePanels = useCallback(
    async (panelIds: string[]): Promise<boolean> => {
      if (panelIds.length === 0) {
        toast({
          title: "操作失败",
          description: "请先选择要删除的分镜",
          variant: "destructive",
        });
        return false;
      }

      setOperationLoading({ type: "delete", isLoading: true });
      try {
        const response = await fetch("/api/panel/batch-delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ panelIds }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "批量删除失败");
        }

        toast({
          title: "删除成功",
          description: `已删除 ${panelIds.length} 个分镜`,
        });

        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "未知错误";
        toast({
          title: "删除失败",
          description: message,
          variant: "destructive",
        });
        return false;
      } finally {
        setOperationLoading({ type: null, isLoading: false });
      }
    },
    [toast]
  );

  return {
    operationLoading,
    batchUpdatePanels,
    batchUpdateCamera,
    batchUpdateCharacter,
    batchUpdateStyle,
    batchDeletePanels,
  };
}
