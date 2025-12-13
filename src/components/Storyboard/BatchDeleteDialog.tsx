/**
 * 批量删除确认弹窗组件
 *
 * 功能：
 * - 显示将要删除的分镜数量
 * - 二次确认防止误删
 * - 显示删除后果警告
 */

"use client";

import { useState } from "react";
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
import { Loader2, AlertTriangle } from "lucide-react";

interface BatchDeleteDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onOpenChange: (open: boolean) => void;
  /** 已选中的分镜数量 */
  selectedCount: number;
  /** 确认删除回调 */
  onConfirm: () => Promise<void>;
}

export default function BatchDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: BatchDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            确认删除分镜
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              您即将删除{" "}
              <span className="font-bold text-foreground">{selectedCount}</span>{" "}
              个分镜。
            </p>
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-destructive">注意：此操作不可撤销</p>
              <ul className="mt-2 list-disc list-inside text-muted-foreground space-y-1">
                <li>分镜内容将被永久删除</li>
                <li>已生成的图片将一并删除</li>
                <li>剩余分镜将自动重新编号</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                删除中...
              </>
            ) : (
              <>删除 {selectedCount} 个分镜</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
