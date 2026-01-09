"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BatchOperationBar } from "@/components/common/BatchOperationBar";
import { useBatchSelection } from "@/hooks/useBatchSelection";

interface Panel {
  id: string;
  prompt_used?: string;
  [key: string]: unknown;
}

interface BatchOperationsManagerProps {
  panels: Panel[];
  onRefresh: () => Promise<void>;
}

export function BatchOperationsManager({
  panels,
  onRefresh,
}: BatchOperationsManagerProps) {
  const { toast } = useToast();
  const panelSelection = useBatchSelection(panels, {
    getId: (panel: Panel) => panel.id,
  });

  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);

  // 批量生成
  const handleBatchGenerate = useCallback(async () => {
    const selectedIds = panelSelection.getSelectedItems();
    const selectedPanels = panels.filter((p) => selectedIds.includes(p.id));

    if (selectedPanels.length === 0) return;

    // 过滤出有 prompt_used 的分镜
    const panelsWithPrompt = selectedPanels.filter((p) => p.prompt_used);
    if (panelsWithPrompt.length === 0) {
      toast({
        title: "无法生成",
        description: "选中的分镜都没有提示词，请先生成提示词",
        variant: "destructive",
      });
      return;
    }

    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: panelsWithPrompt.length });

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

      // 清除选择并刷新数据
      panelSelection.deselectAll();
      await onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量生成失败";
      toast({
        title: "批量生成失败",
        description: message,
        variant: "destructive",
      });
      console.error("批量生成失败:", error);
    } finally {
      setBatchGenerating(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  }, [panelSelection, panels, onRefresh, toast]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    const selectedCount = panelSelection.selectedCount;
    if (selectedCount === 0) return;

    // 打开确认对话框
    setShowBatchDeleteDialog(true);
  }, [panelSelection.selectedCount]);

  // 确认批量删除
  const confirmBatchDelete = useCallback(async () => {
    try {
      const response = await fetch("/api/panel/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: Array.from(panelSelection.selected),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "批量删除失败");
      }

      toast({
        title: "删除成功",
        description: `已删除 ${panelSelection.selectedCount} 个分镜`,
      });

      // 清除选择并刷新数据
      panelSelection.deselectAll();
      await onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量删除失败";
      toast({
        title: "批量删除失败",
        description: message,
        variant: "destructive",
      });
      console.error("批量删除失败:", error);
    } finally {
      setShowBatchDeleteDialog(false);
    }
  }, [panelSelection, onRefresh, toast]);

  // 如果没有选中任何分镜，不显示任何内容
  if (panelSelection.selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* 批量操作工具栏 */}
      <div className="mb-4">
        <BatchOperationBar
          selectedCount={panelSelection.selectedCount}
          totalCount={panels.length}
          onSelectAll={panelSelection.selectAll}
          onDeselectAll={panelSelection.deselectAll}
          onBatchGenerate={handleBatchGenerate}
          onBatchDelete={handleBatchDelete}
          isGenerating={batchGenerating}
          generatingProgress={batchProgress}
        />
      </div>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 {panelSelection.selectedCount} 个分镜吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBatchDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
