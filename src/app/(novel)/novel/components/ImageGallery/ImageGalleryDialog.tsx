/**
 * 图片管理弹窗组件（用于 Canvas 页面）
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { Images, AlertCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageViewerDialog } from "@/components/ui/image-viewer-dialog";
import { ImageFilter } from "./ImageFilter";
import { ImageGrid } from "./ImageGrid";
import { useProjectImages } from "./useProjectImages";
import type { ImageGalleryDialogProps, ImageFilterState, ProjectImage } from "./types";
import { IMAGE_TYPE_LABELS } from "./types";

export function ImageGalleryDialog({
  projectId,
  open,
  onOpenChange,
}: ImageGalleryDialogProps) {
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
    enabled: open, // 只在弹窗打开时请求
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Images className="w-5 h-5 text-purple-400" />
              项目图片
              {totalCount > 0 && (
                <span className="text-sm font-normal text-zinc-400">
                  ({totalCount} 张)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* 筛选器 */}
            <ImageFilter
              value={filter}
              onChange={setFilter}
              totalCount={totalCount}
            />

            {/* 错误状态 */}
            {isError ? (
              <div className="flex flex-col items-center justify-center py-16 text-red-400">
                <AlertCircle className="w-8 h-8 mb-3" />
                <p className="text-sm">
                  {error instanceof Error ? error.message : "加载失败"}
                </p>
              </div>
            ) : (
              <ImageGrid
                images={allImages}
                isLoading={isLoading}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={!!hasNextPage}
                onLoadMore={handleLoadMore}
                onImageClick={handleImageClick}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 图片查看器（在 Dialog 外部，避免层级问题） */}
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
    </>
  );
}
