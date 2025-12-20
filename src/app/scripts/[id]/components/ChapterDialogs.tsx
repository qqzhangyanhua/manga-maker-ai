/**
 * Chapter Dialogs - All dialog components for chapter operations
 */

"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Chapter } from "../types/script-editor.types";

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: { title: string; summary: string };
  onFormChange: (data: { title: string; summary: string }) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function CreateChapterDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onConfirm,
  isPending,
}: CreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建章节</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">章节标题</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => onFormChange({ ...formData, title: e.target.value })}
              placeholder="例如：第一章：相遇"
            />
          </div>
          <div>
            <Label htmlFor="summary">章节梗概（可选）</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => onFormChange({ ...formData, summary: e.target.value })}
              placeholder="简要描述本章内容..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: { title: string; summary: string };
  onFormChange: (data: { title: string; summary: string }) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function EditChapterDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onConfirm,
  isPending,
}: EditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑章节</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-title">章节标题</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => onFormChange({ ...formData, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="edit-summary">章节梗概</Label>
            <Textarea
              id="edit-summary"
              value={formData.summary}
              onChange={(e) => onFormChange({ ...formData, summary: e.target.value })}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface KeyChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
}

export function KeyChapterDialog({
  open,
  onOpenChange,
  reason,
  onReasonChange,
  onConfirm,
}: KeyChapterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>标记为关键章节</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="key-reason">为什么这是关键章节？</Label>
            <Textarea
              id="key-reason"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="例如：角色死亡、重大转折、身份揭露"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={!reason.trim()}>
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: Chapter | null;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  chapter,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除章节"{chapter?.title}"吗？此操作将同时删除该章节下的所有分镜，且无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface OverwriteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function OverwriteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: OverwriteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认覆盖</AlertDialogTitle>
          <AlertDialogDescription>
            当前已有章节，是否覆盖？此操作将删除所有现有章节并重新生成。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认覆盖</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
