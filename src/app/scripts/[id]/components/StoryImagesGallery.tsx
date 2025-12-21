import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Image as ImageIcon, Loader2, ChevronLeft, ChevronRight, X, Edit, BookOpen, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ImageEditDialog } from "./ImageEditDialog";
import { useToast } from "@/hooks/use-toast";

type GeneratedImage = {
  id: string;
  image_url: string;
  prompt: string;
  style: string | null;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  chapter_info?: {
    id: string;
    title: string;
    chapter_order: number;
  } | null;
  panel_info?: Array<{
    id: string;
    panel_order: number;
    description: string;
  }> | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type StoryImagesGalleryProps = {
  storyId: string;
  projectId?: string | null; // Add projectId prop
};

export function StoryImagesGallery({ storyId, projectId }: StoryImagesGalleryProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, storyId, projectId]);

  async function fetchImages() {
    if (!projectId) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/story/${storyId}/generated-images?page=${page}&limit=12&projectId=${projectId}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "获取图片失败");
      }

      setImages(data.data?.images || []);
      setPagination(data.data?.pagination || null);
    } catch (error) {
      console.error("Failed to fetch images:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleImageClick(image: GeneratedImage) {
    setSelectedImage(image);
    setDialogOpen(true);
  }

  function handleEditClick(image: GeneratedImage) {
    setSelectedImage(image);
    setEditDialogOpen(true);
  }

  async function handleEditSubmit(
    imageId: string,
    editData: {
      editType: "regenerate" | "variant" | "inpaint" | "style_transfer";
      prompt?: string;
      style?: string;
      variantCount?: number;
      variantType?: "style" | "angle" | "composition";
      targetStyle?: string;
      strength?: number;
      providerType?: string;
    }
  ) {
    try {
      const res = await fetch(`/api/generated-image/${imageId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "编辑失败");
      }

      // Show success message with details
      let description = data.message || "新图片已生成";
      if (data.imageUrls && data.imageUrls.length > 0) {
        description = `成功生成 ${data.imageUrls.length} 张图片`;
      } else if (data.imageUrl) {
        description = "新图片已生成，正在刷新图库...";
      }

      toast({
        title: "生成完成",
        description,
      });

      // Refresh images immediately and wait for completion
      await fetchImages();
    } catch (error) {
      console.error("Edit submission error:", error);
      toast({
        title: "编辑失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
      throw error;
    }
  }

  if (loading && images.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        加载图片中...
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>暂无关联的项目</p>
      </div>
    );
  }

  if (images.length === 0 && !loading) {
    return (
      <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>暂无生成的图片</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-[3/4] bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => handleImageClick(img)}
            >
              <img
                src={img.image_url}
                alt={img.prompt}
                className="w-full h-full object-cover"
              />
              
              {/* 章节和分镜标签 - 始终显示 */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {img.chapter_info && (
                  <Badge variant="secondary" className="bg-blue-500/90 text-white text-xs">
                    <BookOpen className="w-3 h-3 mr-1" />
                    第{img.chapter_info.chapter_order}章
                  </Badge>
                )}
                {img.panel_info && img.panel_info.length > 0 && (
                  <Badge variant="secondary" className="bg-purple-500/90 text-white text-xs">
                    <Film className="w-3 h-3 mr-1" />
                    {img.panel_info.length > 1 
                      ? `${img.panel_info.length}镜` 
                      : `第${img.panel_info[0].panel_order}镜`}
                  </Badge>
                )}
              </div>

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(img);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-white text-xs line-clamp-2">{img.prompt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 张
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Image Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>图片详情</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.prompt}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-3">
                {/* 章节和分镜信息 */}
                {(selectedImage.chapter_info || selectedImage.panel_info) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedImage.chapter_info && (
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {selectedImage.chapter_info.title}
                      </Badge>
                    )}
                    {selectedImage.panel_info && selectedImage.panel_info.length > 0 && (
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-700 dark:text-purple-300">
                        <Film className="w-3 h-3 mr-1" />
                        {selectedImage.panel_info.length > 1 
                          ? `包含 ${selectedImage.panel_info.length} 个分镜` 
                          : `分镜 #${selectedImage.panel_info[0].panel_order}`}
                      </Badge>
                    )}
                  </div>
                )}

                {/* 分镜详情（多镜时显示） */}
                {selectedImage.panel_info && selectedImage.panel_info.length > 1 && (
                  <div className="border rounded-lg p-3 bg-muted/30">
                    <div className="text-sm font-medium mb-2">包含的分镜：</div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {selectedImage.panel_info.map((panel) => (
                        <div key={panel.id} className="flex items-start gap-2">
                          <span className="font-medium text-foreground">#{panel.panel_order}</span>
                          <span className="line-clamp-1">{panel.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {selectedImage.style && (
                    <span className="px-2 py-1 bg-muted rounded">{selectedImage.style}</span>
                  )}
                  <span>{format(new Date(selectedImage.created_at), "yyyy-MM-dd HH:mm")}</span>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">提示词</div>
                  <p className="text-sm text-muted-foreground">{selectedImage.prompt}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      handleEditClick(selectedImage);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    AI 编辑
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Edit Dialog */}
      <ImageEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        image={selectedImage}
        onEditSubmit={handleEditSubmit}
      />
    </>
  );
}
