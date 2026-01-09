"use client";

/**
 * 分镜历史记录对话框
 * 查看同一分镜的历史生成图片
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  Check,
  Download,
  Trash2,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface GeneratedImage {
  id: string;
  image_url: string;
  prompt_used: string | null;
  created_at: string;
  is_current: boolean;
}

interface PanelHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelId: string | null;
  currentImageUrl: string | null;
  onSelectImage: (imageUrl: string) => void;
}

export function PanelHistoryDialog({
  open,
  onOpenChange,
  panelId,
  currentImageUrl,
  onSelectImage,
}: PanelHistoryDialogProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // 加载历史记录
  useEffect(() => {
    if (open && panelId) {
      loadHistory();
    }
  }, [open, panelId]);

  const loadHistory = async () => {
    if (!panelId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/panel/${panelId}/history`);
      if (!response.ok) {
        throw new Error("加载历史记录失败");
      }

      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error("加载历史记录失败:", error);
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectImage = (image: GeneratedImage) => {
    setSelectedImageId(image.id);
    onSelectImage(image.image_url);
  };

  const handleApplyImage = async () => {
    if (!selectedImageId || !panelId) return;

    try {
      const response = await fetch(`/api/panel/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generated_image: images.find((img) => img.id === selectedImageId)
            ?.image_url,
        }),
      });

      if (!response.ok) {
        throw new Error("应用图片失败");
      }

      toast({
        title: "应用成功",
        description: "已将选中的历史图片设为当前图片",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("应用图片失败:", error);
      toast({
        title: "应用失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `panel-history-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (imageId: string) => {
    try {
      const response = await fetch(`/api/generated-images/${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      toast({
        title: "删除成功",
        description: "历史记录已删除",
      });

      // 重新加载
      await loadHistory();
    } catch (error) {
      console.error("删除失败:", error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] bg-[#1a1a1f] border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <History className="w-5 h-5 text-orange-400" />
            历史生成记录
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            查看并管理此分镜的所有生成图片
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400">暂无历史记录</p>
              <p className="text-sm text-gray-500 mt-2">
                生成图片后会自动保存历史记录
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 gap-4">
                {images.map((image, index) => {
                  const isSelected = selectedImageId === image.id;
                  const isCurrent = image.image_url === currentImageUrl;

                  return (
                    <div
                      key={image.id}
                      className={cn(
                        "relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                        isSelected
                          ? "border-orange-500 ring-2 ring-orange-500/50"
                          : isCurrent
                          ? "border-green-500"
                          : "border-gray-800 hover:border-gray-700"
                      )}
                      onClick={() => handleSelectImage(image)}
                    >
                      {/* 图片 */}
                      <div className="aspect-video bg-gray-900">
                        <img
                          src={image.image_url}
                          alt={`历史记录 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* 标签 */}
                      <div className="absolute top-2 left-2 flex gap-2">
                        {isCurrent && (
                          <Badge className="bg-green-500/90 text-white">
                            <Check className="w-3 h-3 mr-1" />
                            当前
                          </Badge>
                        )}
                        <Badge variant="secondary" className="bg-black/80">
                          #{index + 1}
                        </Badge>
                      </div>

                      {/* 操作按钮 */}
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 w-7 p-0 bg-black/80 hover:bg-black"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(image.image_url, index);
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                        {!isCurrent && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 w-7 p-0 bg-red-500/80 hover:bg-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(image.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      {/* 信息 */}
                      <div className="p-3 bg-gray-900/80 backdrop-blur-sm">
                        <div className="text-xs text-gray-400 mb-1">
                          {new Date(image.created_at).toLocaleString("zh-CN")}
                        </div>
                        {image.prompt_used && (
                          <div className="text-xs text-gray-500 line-clamp-2 font-mono">
                            {image.prompt_used}
                          </div>
                        )}
                      </div>

                      {/* 选中指示器 */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-orange-500/10 pointer-events-none" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {images.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <div className="text-sm text-gray-400">
              共 {images.length} 条记录
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                关闭
              </Button>
              {selectedImageId && selectedImageId !== currentImageUrl && (
                <Button
                  onClick={handleApplyImage}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  应用此图片
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
