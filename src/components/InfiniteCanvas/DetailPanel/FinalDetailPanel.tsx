/**
 * 最终漫画详情面板
 *
 * 功能:
 * 1. 漫画拼图展示
 * 2. 支持下载
 * 3. 支持重新生成
 */

"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookImage, RefreshCw, Loader2, AlertCircle, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ComicPanel {
  id: string;
  image_url: string;
  panel_order: number;
  created_at: string;
}

interface FinalDetailResponse {
  chapterId: string;
  chapterNumber: number;
  panels: ComicPanel[];
  totalCount: number;
}

interface FinalDetailPanelProps {
  chapterId: string;
}

export function FinalDetailPanel({ chapterId }: FinalDetailPanelProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<FinalDetailResponse>({
    queryKey: ['final-detail', chapterId],
    queryFn: async () => {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/final`);
      if (!response.ok) throw new Error('获取漫画详情失败');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/generate-finals`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('重新生成失败');
      return response.json();
    },
    onSuccess: () => {
      toast.success('开始重新生成漫画');
      queryClient.invalidateQueries({ queryKey: ['final-detail', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
    onError: (error: Error) => {
      toast.error('重新生成失败', { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载漫画作品中...</p>
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

  if (!data || data.panels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <BookImage className="w-12 h-12 mb-3 text-zinc-600" />
        <p className="text-sm mb-4">暂无漫画作品</p>
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
              生成漫画
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部统计 */}
      <div className="bg-gradient-to-r from-pink-900/20 to-rose-900/20 border border-pink-800/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white mb-1">
              第 {data.chapterNumber} 章漫画
            </h3>
            <p className="text-xs text-zinc-400">共 {data.totalCount} 张漫画</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-pink-800/50 text-pink-300 hover:bg-pink-900/30"
            >
              <Download className="w-3 h-3 mr-1" />
              下载全部
            </Button>
            <Button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              variant="outline"
              size="sm"
              className="border-pink-800/50 text-pink-300 hover:bg-pink-900/30"
            >
              {regenerateMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  生成中
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  重新生成
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 漫画网格 */}
      <div className="space-y-3">
        {data.panels.map((panel) => (
          <div
            key={panel.id}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors group"
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative">
              {panel.image_url ? (
                <>
                  <img
                    src={panel.image_url}
                    alt={`Panel ${panel.panel_order}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                    #{panel.panel_order}
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="ghost" className="text-white">
                      <Eye className="w-4 h-4 mr-1" />
                      查看
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white">
                      <Download className="w-4 h-4 mr-1" />
                      下载
                    </Button>
                  </div>
                </>
              ) : (
                <BookImage className="w-16 h-16 text-zinc-600" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
