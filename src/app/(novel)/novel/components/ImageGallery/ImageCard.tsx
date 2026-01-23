/**
 * 图片卡片组件
 */

"use client";

import { useState } from "react";
import { Eye, Download, Camera, Layers, Grid3X3, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectImage, ImageType } from "./types";
import { IMAGE_TYPE_LABELS, IMAGE_TYPE_COLORS } from "./types";

interface ImageCardProps {
  image: ProjectImage;
  onViewClick: (image: ProjectImage) => void;
}

/**
 * 获取图片类型图标
 */
function getTypeIcon(type: ImageType) {
  switch (type) {
    case "shot":
      return Camera;
    case "scene":
      return Layers;
    case "comic":
      return ImageIcon;
    case "nine_grid":
      return Grid3X3;
    default:
      return ImageIcon;
  }
}

export function ImageCard({ image, onViewClick }: ImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const TypeIcon = getTypeIcon(image.type);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${image.type}_${image.chapterNumber}_${image.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("下载失败:", err);
    }
  };

  return (
    <div
      className={cn(
        "group relative bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden",
        "hover:border-zinc-600 transition-all duration-200 cursor-pointer"
      )}
      onClick={() => onViewClick(image)}
    >
      {/* 图片区域 */}
      <div className="aspect-video bg-zinc-900 relative overflow-hidden">
        {!hasError ? (
          <img
            src={image.imageUrl}
            alt={`${IMAGE_TYPE_LABELS[image.type]} - 第${image.chapterNumber}章`}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}

        {/* 加载占位 */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
        )}

        {/* Hover 遮罩 */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onViewClick(image);
            }}
          >
            <Eye className="w-4 h-4 mr-1" />
            查看
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* 类型标签 */}
        <div className="absolute top-2 left-2">
          <Badge
            variant="outline"
            className={cn(
              "text-xs border backdrop-blur-sm",
              IMAGE_TYPE_COLORS[image.type]
            )}
          >
            <TypeIcon className="w-3 h-3 mr-1" />
            {IMAGE_TYPE_LABELS[image.type]}
          </Badge>
        </div>
      </div>

      {/* 信息区域 */}
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">
            第 {image.chapterNumber} 章
          </span>
          {image.shotOrder !== undefined && (
            <span className="text-xs text-zinc-400">
              镜头 {image.shotOrder}
            </span>
          )}
        </div>
        <div className="text-xs text-zinc-500">
          {new Date(image.createdAt).toLocaleString("zh-CN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
