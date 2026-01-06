"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  ScriptOperationsContextValue,
  BatchOperationState,
  DialogState,
} from "../types/providers.types";
import { useScriptData } from "./ScriptDataProvider";

const ScriptOperationsContext = createContext<ScriptOperationsContextValue | null>(null);

interface ScriptOperationsProviderProps {
  children: ReactNode;
}

/**
 * 业务逻辑层 Provider
 *
 * 职责：
 * 1. 处理批量操作（生成、删除）
 * 2. 管理对话框状态
 * 3. 处理错误状态
 * 4. 提供业务操作方法
 *
 * 设计原则：
 * - 与数据层解耦，通过 useScriptData 获取数据
 * - 所有业务逻辑集中管理
 * - 错误处理统一化
 */
export function ScriptOperationsProvider({ children }: ScriptOperationsProviderProps) {
  const { toast } = useToast();
  const { panels, refetchPanels, refetchAll } = useScriptData();

  // 批量操作状态
  const [batchOperation, setBatchOperation] = useState<BatchOperationState>({
    isGenerating: false,
    isDeleting: false,
    progress: { current: 0, total: 0 },
  });

  // 对话框状态
  const [dialogs, setDialogs] = useState<DialogState>({
    importText: false,
    batchDelete: false,
    assetSidebar: false,
  });

  // 错误状态
  const [errorState, setErrorState] = useState<string | null>(null);

  // ============ 批量操作 ============

  const handleBatchGenerate = useCallback(
    async (panelIds: string[]) => {
      const selectedPanels = panels.filter((p) => panelIds.includes(p.id));
      if (selectedPanels.length === 0) return;

      // 过滤出有 prompt_used 的分镜
      const panelsWithPrompt = selectedPanels.filter((p) => p.prompt_used);
      if (panelsWithPrompt.length === 0) {
        setErrorState("选中的分镜都没有提示词，请先生成提示词");
        return;
      }

      setBatchOperation({
        isGenerating: true,
        isDeleting: false,
        progress: { current: 0, total: panelsWithPrompt.length },
      });

      try {
        const response = await fetch("/api/panel/batch-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            panel_ids: panelsWithPrompt.map((p) => p.id),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "批量生成失败");
        }

        const result = await response.json();

        toast({
          title: "批量生成完成",
          description: `成功: ${result.succeeded}, 失败: ${result.failed}, 跳过: ${result.skipped}`,
          variant: result.failed > 0 ? "destructive" : "default",
        });

        // 刷新数据
        await refetchPanels();
      } catch (error) {
        const message = error instanceof Error ? error.message : "批量生成失败";
        setErrorState(message);
        console.error("批量生成失败:", error);
      } finally {
        setBatchOperation({
          isGenerating: false,
          isDeleting: false,
          progress: { current: 0, total: 0 },
        });
      }
    },
    [panels, refetchPanels, toast]
  );

  // 存储待删除的面板 IDs
  const [pendingDeletePanelIds, setPendingDeletePanelIds] = useState<string[]>([]);

  const handleBatchDelete = useCallback(
    async (panelIds: string[]) => {
      if (panelIds.length === 0) return;

      // 存储待删除的 IDs 并打开确认对话框
      setPendingDeletePanelIds(panelIds);
      setDialogs((prev) => ({ ...prev, batchDelete: true }));
    },
    []
  );

  // 确认批量删除的方法
  const confirmBatchDelete = useCallback(async () => {
    if (pendingDeletePanelIds.length === 0) return;

    setBatchOperation({
      isGenerating: false,
      isDeleting: true,
      progress: { current: 0, total: pendingDeletePanelIds.length },
    });

    try {
      const response = await fetch("/api/panel/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: pendingDeletePanelIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "批量删除失败");
      }

      toast({
        title: "删除成功",
        description: `已删除 ${pendingDeletePanelIds.length} 个分镜`,
      });

      // 刷新数据
      await refetchPanels();
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量删除失败";
      setErrorState(message);
      console.error("批量删除失败:", error);
    } finally {
      setBatchOperation({
        isGenerating: false,
        isDeleting: false,
        progress: { current: 0, total: 0 },
      });
      setPendingDeletePanelIds([]);
      setDialogs((prev) => ({ ...prev, batchDelete: false }));
    }
  }, [pendingDeletePanelIds, refetchPanels, toast]);

  // ============ 导入导出 ============

  const handleImportTextSuccess = useCallback(
    (chapterId: string) => {
      setDialogs((prev) => ({ ...prev, importText: false }));
      void refetchAll();
      toast({
        title: "导入成功",
        description: "已成功生成分镜，刷新页面查看",
      });
    },
    [refetchAll, toast]
  );

  // ============ 对话框管理 ============

  const openDialog = useCallback((dialogName: keyof DialogState) => {
    setDialogs((prev) => ({ ...prev, [dialogName]: true }));
  }, []);

  const closeDialog = useCallback((dialogName: keyof DialogState) => {
    setDialogs((prev) => ({ ...prev, [dialogName]: false }));
  }, []);

  // ============ 错误处理 ============

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  // Context 值
  const value: ScriptOperationsContextValue = {
    // 批量操作
    batchOperation,
    handleBatchGenerate,
    handleBatchDelete,
    confirmBatchDelete,
    pendingDeletePanelIds,

    // 导入导出
    handleImportTextSuccess,

    // 对话框管理
    dialogs,
    openDialog,
    closeDialog,

    // 错误处理
    errorState,
    setErrorState,
    clearError,
  };

  return (
    <ScriptOperationsContext.Provider value={value}>
      {children}
    </ScriptOperationsContext.Provider>
  );
}

/**
 * 使用业务逻辑层 Context 的 Hook
 */
export function useScriptOperations(): ScriptOperationsContextValue {
  const context = useContext(ScriptOperationsContext);
  if (!context) {
    throw new Error("useScriptOperations must be used within ScriptOperationsProvider");
  }
  return context;
}
