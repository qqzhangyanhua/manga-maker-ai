"use client";

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
import { Loader2 } from "lucide-react";
import type { AdminDeleteDialogProps } from "@/types/admin";

/**
 * 管理后台通用删除确认对话框
 *
 * 使用示例：
 * ```tsx
 * <AdminDeleteDialog
 *   open={deleteDialogOpen}
 *   title="删除确认"
 *   description={<>确定要删除 <strong>{item?.name}</strong> 吗？</>}
 *   loading={deleting}
 *   onOpenChange={setDeleteDialogOpen}
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export function AdminDeleteDialog({
  open,
  title,
  description,
  confirmText = "删除",
  cancelText = "取消",
  loading = false,
  onOpenChange,
  onConfirm,
}: AdminDeleteDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
