/**
 * 故事板缩略图组件
 * 显示单个分镜的缩略图
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2, ImageOff, AlertCircle } from "lucide-react";
import type { Panel } from "../../types/script-editor.types";

interface StoryboardThumbnailProps {
  panel: Panel;
  index: number;
  size: "small" | "medium" | "large";
  isSelected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

const sizeMap = {
  small: "w-[60px] h-[60px]",
  medium: "w-[100px] h-[100px]",
  large: "w-[160px] h-[160px]",
};

export function StoryboardThumbnail({
  panel,
  index,
  size,
  isSelected = false,
  onClick,
  onDoubleClick,
}: StoryboardThumbnailProps) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = panel.generated_image || panel.image_url;
  const isGenerating = (panel as Panel & { _isGenerating?: boolean })._isGenerating;

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "relative rounded-lg overflow-hidden cursor-pointer",
        "border-2 transition-all duration-200",
        "hover:scale-105 hover:shadow-lg",
        sizeMap[size],
        isSelected
          ? "border-primary ring-2 ring-primary/30"
          : "border-gray-700 hover:border-gray-500"
      )}
    >
      {/* 序号角标 */}
      <div className="absolute top-1 left-1 z-10 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
        {index + 1}
      </div>

      {/* 状态指示器 */}
      {isGenerating && (
        <div className="absolute top-1 right-1 z-10">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        </div>
      )}

      {/* 图片内容 */}
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={`Panel ${index + 1}`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          {imageError ? (
            <AlertCircle className="w-6 h-6 text-destructive" />
          ) : (
            <ImageOff className="w-6 h-6 text-gray-500" />
          )}
        </div>
      )}

      {/* 选中遮罩 */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
      )}
    </div>
  );
}
