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
} from "@/components/ui/dropdown-menu";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import type { Panel } from "../types/script-editor.types";

interface PanelCardActionsProps {
  panel: Panel;
  onEdit: (panel: Panel) => void;
  onDelete: (id: string) => void;
}

export function PanelCardActions({
  panel,
  onEdit,
  onDelete,
}: PanelCardActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(panel)}>
          <Edit className="w-4 h-4 mr-2" />
          编辑
        </DropdownMenuItem>
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
