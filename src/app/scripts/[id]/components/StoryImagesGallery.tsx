import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Image as ImageIcon, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type GeneratedImage = {
  id: string;
  image_url: string;
  prompt: string;
  style: string | null;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
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
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
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
              <div className="space-y-2">
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
