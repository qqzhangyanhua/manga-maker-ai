/**
 * 场景图片详情面板
 *
 * 功能:
 * 1. 图片网格展示
 * 2. 支持查看大图
 * 3. 支持重新生成
 */

"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, RefreshCw, Loader2, AlertCircle, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ImageViewerDialog } from '@/components/ui/image-viewer-dialog';
import { useState } from 'react';

interface SceneImage {
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
}

interface SceneDetailResponse {
  chapterId: string;
  chapterNumber: number;
  scenes: SceneImage[];
  totalCount: number;
}

interface SceneDetailPanelProps {
  chapterId: string;
}

export function SceneDetailPanel({ chapterId }: SceneDetailPanelProps) {
  const queryClient = useQueryClient();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SceneImage | null>(null);

  const { data, isLoading, error } = useQuery<SceneDetailResponse>({
    queryKey: ['scene-detail', chapterId],
    queryFn: async () => {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/scene`);
      if (!response.ok) throw new Error('获取场景详情失败');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/generate-scenes`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('重新生成失败');
      return response.json();
    },
    onSuccess: () => {
      toast.success('开始重新生成场景');
      queryClient.invalidateQueries({ queryKey: ['scene-detail', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
    onError: (error: Error) => {
      toast.error('重新生成失败', { description: error.message });
    },
  });

  const handleImageClick = (scene: SceneImage) => {
    setSelectedImage(scene);
    setViewerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载场景图片中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400">
        <AlertCircle className="w-8 h-8 mb-3" />
        <p className="text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  if (!data || data.scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <ImageIcon className="w-12 h-12 mb-3 text-zinc-600" />
        <p className="text-sm mb-4">暂无场景图片</p>
        <Button
          onClick={() => regenerateMutation.mutate()}
          disabled={regenerateMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {regenerateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              生成场景
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部统计 */}
      <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-800/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white mb-1">
              第 {data.chapterNumber} 章场景
            </h3>
            <p className="text-xs text-zinc-400">共 {data.totalCount} 张场景图片</p>
          </div>
          <Button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            variant="outline"
            size="sm"
            className="border-green-800/50 text-green-300 hover:bg-green-900/30"
          >
            {regenerateMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                生成中
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                重新生成全部
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 图片网格 */}
      <div className="grid grid-cols-2 gap-3">
        {data.scenes.map((scene) => (
          <div
            key={scene.id}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors group"
          >
            <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative">
              {scene.image_url ? (
                <>
                  <img
                    src={scene.image_url}
                    alt="Scene"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => handleImageClick(scene)}
                  >
                    <Button size="sm" variant="ghost" className="text-white">
                      <Maximize2 className="w-4 h-4 mr-1" />
                      查看大图
                    </Button>
                  </div>
                </>
              ) : (
                <ImageIcon className="w-12 h-12 text-zinc-600" />
              )}
            </div>
            <div className="p-2">
              <p className="text-xs text-zinc-500 line-clamp-2">{scene.prompt}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 图片查看器对话框 */}
      <ImageViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        imageUrl={selectedImage?.image_url || ''}
        title="场景图片"
        description={selectedImage?.prompt}
      />
    </div>
  );
}
