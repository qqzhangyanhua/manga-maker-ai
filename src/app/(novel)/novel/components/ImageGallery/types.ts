/**
 * 图片管理功能类型定义
 */

/**
 * 图片类型枚举
 */
export type ImageType = "shot" | "comic" | "nine_grid";

/**
 * 图片类型标签
 */
export const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
  shot: "镜头图",
  comic: "漫画图",
  nine_grid: "九宫格",
};

/**
 * 图片类型颜色
 */
export const IMAGE_TYPE_COLORS: Record<ImageType, string> = {
  shot: "bg-blue-900/30 text-blue-300 border-blue-800/50",
  comic: "bg-purple-900/30 text-purple-300 border-purple-800/50",
  nine_grid: "bg-amber-900/30 text-amber-300 border-amber-800/50",
};

/**
 * 统一图片格式
 */
export interface ProjectImage {
  id: string;
  type: ImageType;
  imageUrl: string;
  chapterNumber: number;
  chapterTitle?: string;
  shotOrder?: number;
  createdAt: string;
  metadata: {
    prompt?: string;
    styleId?: string;
    styleName?: string;
    shotSize?: string;
    cameraAngle?: string;
  };
}

/**
 * API 响应类型
 */
export interface ProjectImagesResponse {
  images: ProjectImage[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 筛选器状态
 */
export interface ImageFilterState {
  type: ImageType | "all";
  chapterId?: string;
}

/**
 * ImageGalleryPanel Props
 */
export interface ImageGalleryPanelProps {
  projectId: string;
  className?: string;
}

/**
 * ImageGalleryDialog Props
 */
export interface ImageGalleryDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
