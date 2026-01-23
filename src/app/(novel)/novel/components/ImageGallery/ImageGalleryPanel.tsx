/**
 * 图片管理面板组件（用于 Tab）
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { Images, AlertCircle } from "lucide-react";
import { ImageViewerDialog } from "@/components/ui/image-viewer-dialog";
import { ImageFilter } from "./ImageFilter";
import { ImageGrid } from "./ImageGrid";
import { useProjectImages } from "./useProjectImages";
import type { ImageGalleryPanelProps, ImageFilterState, ProjectImage } from "./types";
import { IMAGE_TYPE_LABELS } from "./types";

export function ImageGalleryPanel({ projectId, className }: ImageGalleryPanelProps) {
  const [filter, setFilter] = useState<ImageFilterState>({ type: "all" });
  const [selectedImage, setSelectedImage] = useState<ProjectImage | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProjectImages({
    projectId,
    type: filter.type,
    chapterId: filter.chapterId,
    limit: 24,
  });

  // 合并所有页面的图片
  const allImages = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.images);
  }, [data?.pages]);

  // 总数
  const totalCount = data?.pages[0]?.total ?? 0;

  // 处理图片点击
  const handleImageClick = useCallback((image: ProjectImage) => {
    setSelectedImage(image);
    setViewerOpen(true);
  }, []);

  // 处理加载更多
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 错误状态
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-red-400">
        <AlertCircle className="w-8 h-8 mb-3" />
        <p className="text-sm">{error instanceof Error ? error.message : "加载失败"}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-6">
        <Images className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-semibold text-white">图片管理</h2>
      </div>

      {/* 筛选器 */}
      <div className="mb-6">
        <ImageFilter
          value={filter}
          onChange={setFilter}
          totalCount={totalCount}
        />
      </div>

      {/* 图片网格 */}
      <ImageGrid
        images={allImages}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={!!hasNextPage}
        onLoadMore={handleLoadMore}
        onImageClick={handleImageClick}
      />

      {/* 图片查看器 */}
      <ImageViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        imageUrl={selectedImage?.imageUrl || ""}
        title={
          selectedImage
            ? `${IMAGE_TYPE_LABELS[selectedImage.type]} - 第${selectedImage.chapterNumber}章`
            : ""
        }
        description={selectedImage?.metadata.prompt}
      />
    </div>
  );
}
