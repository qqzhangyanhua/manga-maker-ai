/**
 * 角色图片预览对话框
 * 生成完成后显示预览，支持重新生成、保存、取消
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Character } from "./types";

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  imageUrl: string | null;
  onConfirm: () => void;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export function ImagePreviewDialog({
  isOpen,
  onClose,
  character,
  imageUrl,
  onConfirm,
  onRegenerate,
  isRegenerating = false,
}: ImagePreviewDialogProps) {
  if (!character || !imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>预览生成的图片</DialogTitle>
          <DialogDescription>
            为「{character.name}」生成的角色图片
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 图片预览区域 */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-md">
              {isRegenerating ? (
                <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">重新生成中...</p>
                  </div>
                </div>
              ) : (
                <img
                  src={imageUrl}
                  alt={character.name}
                  className="w-full h-auto rounded-lg shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-character.png";
                  }}
                />
              )}
            </div>
          </div>

          {/* 角色信息 */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{character.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({character.role})
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {character.description}
              </p>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>💡 如果对生成结果不满意，可以点击"重新生成"</p>
            <p>💡 点击"保存"后，图片将关联到此角色</p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                重新生成中...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                重新生成
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isRegenerating}>
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button onClick={onConfirm} disabled={isRegenerating}>
              <Check className="h-4 w-4 mr-2" />
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
