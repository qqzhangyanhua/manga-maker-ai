"use client";

import { useState } from "react";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Trash2, ImageIcon, CheckSquare, Square } from "lucide-react";
import { AdminEmptyState } from "@/components/admin";
import type { ImageGridProps } from "../types";
import { getSourceTypeLabel, getStyleLabel } from "../types";

/**
 * 图片网格组件
 */
export function ImageGrid({
  images,
  loading,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onViewDetail,
  onDelete,
}: ImageGridProps) {
  const allSelected = images.length > 0 && selectedIds.size === images.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < images.length;

  if (loading) {
    return <ImageGridSkeleton />;
  }

  if (images.length === 0) {
    return (
      <AdminEmptyState
        icon={<ImageIcon className="h-12 w-12" />}
        title="暂无图片"
        description="当前筛选条件下没有找到任何生成图片"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 全选/取消全选 */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={allSelected ? onDeselectAll : onSelectAll}
        >
          {allSelected ? (
            <>
              <Square className="h-4 w-4 mr-1" />
              取消全选
            </>
          ) : (
            <>
              <CheckSquare className="h-4 w-4 mr-1" />
              全选
            </>
          )}
        </Button>
        {someSelected && (
          <span className="text-sm text-muted-foreground">
            已选择 {selectedIds.size} 张
          </span>
        )}
      </div>

      {/* 图片网格 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            selected={selectedIds.has(image.id)}
            onToggleSelect={() => onToggleSelect(image.id)}
            onViewDetail={() => onViewDetail(image)}
            onDelete={() => onDelete(image)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 单个图片卡片
 */
interface ImageCardProps {
  image: ImageGridProps["images"][0];
  selected: boolean;
  onToggleSelect: () => void;
  onViewDetail: () => void;
  onDelete: () => void;
}

function ImageCard({
  image,
  selected,
  onToggleSelect,
  onViewDetail,
  onDelete,
}: ImageCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={`group relative rounded-lg border overflow-hidden transition-all ${
        selected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
      }`}
    >
      {/* 选择复选框 */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          className="bg-background/80 backdrop-blur-sm"
        />
      </div>

      {/* 图片 */}
      <div className="aspect-square relative bg-muted">
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        ) : (
          <Image
            src={image.image_url}
            alt={image.prompt?.slice(0, 50) || "Generated image"}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        )}

        {/* 悬浮操作 */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={onViewDetail}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 信息 */}
      <div className="p-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {getSourceTypeLabel(image.source_type)}
          </span>
          <span className="text-muted-foreground">
            {getStyleLabel(image.style)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {image.user?.name || image.user?.email || "-"}
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(image.created_at).toLocaleDateString("zh-CN")}
        </div>
      </div>
    </div>
  );
}

/**
 * 骨架屏
 */
function ImageGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-lg border overflow-hidden">
          <Skeleton className="aspect-square" />
          <div className="p-2 space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
