/**
 * 图片网格组件
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { Loader2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageCard } from "./ImageCard";
import type { ProjectImage } from "./types";

interface ImageGridProps {
  images: ProjectImage[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onImageClick: (image: ProjectImage) => void;
}

export function ImageGrid({
  images,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  onImageClick,
}: ImageGridProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 无限滚动
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        onLoadMore();
      }
    },
    [hasNextPage, isFetchingNextPage, onLoadMore]
  );

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载图片中...</p>
      </div>
    );
  }

  // 空状态
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <ImageOff className="w-12 h-12 mb-3 text-zinc-600" />
        <p className="text-sm">暂无图片</p>
        <p className="text-xs text-zinc-600 mt-1">
          生成镜头、场景或九宫格图片后会在这里显示
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 图片网格 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <ImageCard
            key={`${image.type}-${image.id}`}
            image={image}
            onViewClick={onImageClick}
          />
        ))}
      </div>

      {/* 加载更多触发器 */}
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">加载更多...</span>
          </div>
        ) : hasNextPage ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            className="border-zinc-700 text-zinc-400"
          >
            加载更多
          </Button>
        ) : images.length > 0 ? (
          <span className="text-xs text-zinc-600">已加载全部图片</span>
        ) : null}
      </div>
    </div>
  );
}
