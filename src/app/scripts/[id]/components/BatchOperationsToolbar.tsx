/**
 * Batch Operations Toolbar
 * Toolbar for bulk panel operations
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  Square,
  Trash2,
  Edit,
  X,
  Loader2,
  Grid3x3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BatchAssetBindingDialog } from "./PanelEditor/BatchAssetBindingDialog";
import type { Panel } from "../types/script-editor.types";

interface BatchOperationsToolbarProps {
  panels: Panel[];
  selectedPanelIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onBatchDelete: (ids: string[]) => Promise<void>;
  onRefresh?: () => void;
  onCompose?: (panelIds: string[]) => void;
}

export function BatchOperationsToolbar({
  panels,
  selectedPanelIds,
  onSelectionChange,
  onBatchDelete,
  onRefresh,
  onCompose,
}: BatchOperationsToolbarProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);

  const selectedCount = selectedPanelIds.length;
  const totalCount = panels.length;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  // 合成限制：2-6 个分镜
  const canCompose = selectedCount >= 2 && selectedCount <= 6;

  // Toggle all selection
  function handleToggleAll(): void {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(panels.map((p) => p.id));
    }
  }

  // Clear selection
  function handleClearSelection(): void {
    onSelectionChange([]);
  }

  // Batch delete
  async function handleBatchDelete(): Promise<void> {
    if (selectedCount === 0) return;

    const confirmMessage = `确定要删除选中的 ${selectedCount} 个分镜吗？此操作不可撤销。`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setIsDeleting(true);
      await onBatchDelete(selectedPanelIds);

      toast({
        title: "批量删除成功",
        description: `已删除 ${selectedCount} 个分镜`,
      });

      onSelectionChange([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast({
        title: "批量删除失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (selectedCount === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 rounded-lg border border-border/50">
        <CheckSquare className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          点击分镜卡片上的复选框进行批量选择
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleAll}
          className="ml-auto"
        >
          全选 ({totalCount})
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 rounded-lg border border-primary/30">
        <CheckSquare className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">
          已选中 {selectedCount} 个分镜
        </span>

        <div className="flex items-center gap-2 ml-auto">
          {allSelected ? (
            <Button variant="ghost" size="sm" onClick={handleToggleAll}>
              <Square className="w-4 h-4 mr-1" />
              取消全选
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleToggleAll}>
              <CheckSquare className="w-4 h-4 mr-1" />
              全选 ({totalCount})
            </Button>
          )}

          <div className="w-px h-6 bg-border" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAssetDialogOpen(true)}
          >
            <Edit className="w-4 h-4 mr-1" />
            批量绑定资产
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCompose?.(selectedPanelIds)}
            disabled={!canCompose || !onCompose}
            title={
              !canCompose
                ? selectedCount < 2
                  ? "至少选择2个分镜"
                  : "最多选择6个分镜"
                : "合成多格图片"
            }
          >
            <Grid3x3 className="w-4 h-4 mr-1" />
            合成多格 {canCompose ? `(${selectedCount})` : ""}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleBatchDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1" />
            )}
            批量删除
          </Button>

          <div className="w-px h-6 bg-border" />

          <Button variant="ghost" size="sm" onClick={handleClearSelection}>
            <X className="w-4 h-4 mr-1" />
            清除选择
          </Button>
        </div>
      </div>

      <BatchAssetBindingDialog
        open={isAssetDialogOpen}
        selectedPanelIds={selectedPanelIds}
        onOpenChange={setIsAssetDialogOpen}
        onSuccess={() => {
          onSelectionChange([]);
          onRefresh?.();
        }}
      />
    </>
  );
}
