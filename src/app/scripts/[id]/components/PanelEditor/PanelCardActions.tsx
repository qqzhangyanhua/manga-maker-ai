/**
 * 分镜卡片操作菜单组件
 * 提供编辑、删除等操作按钮
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Edit, MoreHorizontal, Trash2, ImagePlus, Plus, Split, Combine, Sparkles, Share2 } from "lucide-react";
import { SharePanelDialog } from "@/components/SharePanelDialog";
import type { Panel } from "../../types/script-editor.types";

interface PanelCardActionsProps {
  panel: Panel;
  onEdit: (panel: Panel) => void;
  onDelete: (id: string) => void;
  onGenerate?: (panel: Panel) => void;
  isGenerating?: boolean;
  onGenerateVariants?: (panel: Panel) => void; // NEW: Generate variants
  onInsertAfter?: (panel: Panel) => void;
  onSplit?: (panel: Panel) => void;
  onMergeWithNext?: (panel: Panel) => void;
  canMergeWithNext?: boolean;
  onShareSuccess?: () => void; // NEW: Share callback
}

export function PanelCardActions({
  panel,
  onEdit,
  onDelete,
  onGenerate,
  isGenerating = false,
  onGenerateVariants,
  onInsertAfter,
  onSplit,
  onMergeWithNext,
  canMergeWithNext = false,
  onShareSuccess,
}: PanelCardActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteConfirm = () => {
    onDelete(panel.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onGenerate && (
          <>
            <DropdownMenuItem
              onClick={() => onGenerate(panel)}
              disabled={isGenerating}
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              {panel.generated_image || panel.image_url
                ? "重新生成图片"
                : "生成图片"}
            </DropdownMenuItem>
            {onGenerateVariants && (
              <DropdownMenuItem onClick={() => onGenerateVariants(panel)}>
                <Sparkles className="w-4 h-4 mr-2" />
                生成变体
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => onEdit(panel)}>
          <Edit className="w-4 h-4 mr-2" />
          编辑
        </DropdownMenuItem>

        {/* 分享到画廊 */}
        {panel.generated_image && (
          <SharePanelDialog
            panelId={panel.id}
            isShared={panel.is_shared || false}
            showPrompt={panel.show_prompt !== undefined ? panel.show_prompt : true}
            onShareSuccess={onShareSuccess}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Share2 className="w-4 h-4 mr-2" />
                {panel.is_shared ? "管理分享" : "分享到画廊"}
              </DropdownMenuItem>
            }
          />
        )}

        {/* 高级操作 */}
        {(onInsertAfter || onSplit || onMergeWithNext) && (
          <>
            <DropdownMenuSeparator />
            {onInsertAfter && (
              <DropdownMenuItem onClick={() => onInsertAfter(panel)}>
                <Plus className="w-4 h-4 mr-2" />
                在此之后插入
              </DropdownMenuItem>
            )}
            {onSplit && (
              <DropdownMenuItem onClick={() => onSplit(panel)}>
                <Split className="w-4 h-4 mr-2" />
                拆分分镜
              </DropdownMenuItem>
            )}
            {onMergeWithNext && canMergeWithNext && (
              <DropdownMenuItem onClick={() => onMergeWithNext(panel)}>
                <Combine className="w-4 h-4 mr-2" />
                与下一镜合并
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* 删除确认对话框 */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除分镜</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除分镜 #{panel.panel_order} 吗？此操作无法撤销。
            {panel.generated_image && (
              <span className="block mt-2 text-amber-600">
                该分镜已有生成的图片，删除后图片也将被移除。
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
