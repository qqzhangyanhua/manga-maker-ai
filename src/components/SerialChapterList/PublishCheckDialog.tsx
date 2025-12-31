/**
 * 发布检查对话框
 */

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
import type { PublishCheckDialogProps } from "./types";

export function PublishCheckDialog({
  open,
  warnings,
  onOpenChange,
  onConfirm,
}: PublishCheckDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-100">发布提示</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            该章节存在以下问题，确定要发布吗？
            <ul className="mt-3 space-y-1 text-yellow-400">
              {warnings.map((warning, idx) => (
                <li key={idx}>
                  <span className="mr-1">⚠️</span>
                  {warning}
                </li>
              ))}
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-gray-700 text-gray-400">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            确认发布
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
