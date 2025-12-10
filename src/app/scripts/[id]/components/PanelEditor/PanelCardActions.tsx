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
import { Edit, MoreHorizontal, Trash2, ImagePlus, Plus, Split, Combine } from "lucide-react";
import type { Panel } from "../../types/script-editor.types";

interface PanelCardActionsProps {
  panel: Panel;
  onEdit: (panel: Panel) => void;
  onDelete: (id: string) => void;
  onGenerate?: (panel: Panel) => void;
  isGenerating?: boolean;
  onInsertAfter?: (panel: Panel) => void;
  onSplit?: (panel: Panel) => void;
  onMergeWithNext?: (panel: Panel) => void;
  canMergeWithNext?: boolean;
}

export function PanelCardActions({
  panel,
  onEdit,
  onDelete,
  onGenerate,
  isGenerating = false,
  onInsertAfter,
  onSplit,
  onMergeWithNext,
  canMergeWithNext = false,
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
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => onEdit(panel)}>
          <Edit className="w-4 h-4 mr-2" />
          编辑
        </DropdownMenuItem>

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
