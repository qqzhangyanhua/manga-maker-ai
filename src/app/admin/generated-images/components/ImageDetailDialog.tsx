"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ImageIcon, Copy, Check } from "lucide-react";
import type { ImageDetailDialogProps } from "../types";
import { getSourceTypeLabel, getStyleLabel } from "../types";

/**
 * 图片详情对话框组件
 */
export function ImageDetailDialog({
  open,
  image,
  onOpenChange,
  onDelete,
}: ImageDetailDialogProps) {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!image) return null;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(image.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>图片详情</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 图片预览 */}
          <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
            {imageError ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-16 w-16" />
              </div>
            ) : (
              <Image
                src={image.image_url}
                alt={image.prompt?.slice(0, 50) || "Generated image"}
                fill
                className="object-contain"
                onError={() => setImageError(true)}
                unoptimized
              />
            )}
          </div>

          {/* 详细信息 */}
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label="用户" value={image.user?.name || image.user?.email || "-"} />
              <InfoItem
                label="创建时间"
                value={new Date(image.created_at).toLocaleString("zh-CN")}
              />
              <InfoItem label="来源类型" value={getSourceTypeLabel(image.source_type)} />
              <InfoItem label="风格" value={getStyleLabel(image.style)} />
              {image.source_id && (
                <InfoItem label="来源 ID" value={image.source_id} className="col-span-2" />
              )}
              {image.character_id && (
                <InfoItem label="角色 ID" value={image.character_id} className="col-span-2" />
              )}
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Prompt</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={handleCopyPrompt}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      复制
                    </>
                  )}
                </Button>
              </div>
              <ScrollArea className="h-[120px] rounded-md border p-3">
                <p className="text-sm whitespace-pre-wrap">{image.prompt || "-"}</p>
              </ScrollArea>
            </div>

            {/* 生成参数 */}
            {image.generation_params && Object.keys(image.generation_params).length > 0 && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">生成参数</span>
                <ScrollArea className="h-[100px] rounded-md border p-3">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(image.generation_params, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            )}

            {/* 删除按钮 */}
            <Button
              variant="destructive"
              className="w-full"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除图片
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 信息项组件
 */
interface InfoItemProps {
  label: string;
  value: string;
  className?: string;
}

function InfoItem({ label, value, className = "" }: InfoItemProps) {
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="font-medium truncate" title={value}>
        {value}
      </div>
    </div>
  );
}
