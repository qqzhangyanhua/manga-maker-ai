/**
 * 分镜卡片操作菜单组件
 * 提供编辑、删除等操作按钮
 */

"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  return (
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
          onClick={() => onDelete(panel.id)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
