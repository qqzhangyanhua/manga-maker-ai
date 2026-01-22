/**
 * 图片查看器对话框
 *
 * 功能:
 * 1. 全屏显示大图
 * 2. 支持ESC关闭
 * 3. 点击背景关闭
 * 4. 显示图片标题/描述
 */

"use client";

import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title?: string;
  description?: string;
}

export function ImageViewerDialog({
  open,
  onOpenChange,
  imageUrl,
  title,
  description,
}: ImageViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-zinc-800">
        <div className="relative w-full h-full flex flex-col">
          {/* 头部工具栏 */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
            <div className="flex-1">
              {title && (
                <h3 className="text-white font-medium text-lg mb-1">{title}</h3>
              )}
              {description && (
                <p className="text-zinc-400 text-sm line-clamp-2">{description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 图片容器 */}
          <div className="flex items-center justify-center p-4 min-h-[60vh] max-h-[90vh]">
            <img
              src={imageUrl}
              alt={title || "预览图片"}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
