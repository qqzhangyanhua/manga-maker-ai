/**
 * 镜头设计详情面板
 *
 * 功能:
 * 1. 显示章节的所有镜头设计
 * 2. 缩略图网格展示
 * 3. 显示镜头参数 (角度、景别、面板类型)
 * 4. 支持重新生成
 */

"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  Film,
  Layout,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  useShotGenerateDialog,
  useOpenShotGenerateDialog,
  useCloseShotGenerateDialog,
} from '@/stores/canvas-store';
import { GenerateShotImageDialog } from '../GenerateShotImageDialog';

/**
 * 镜头设计类型
 */
interface ShotDesign {
  id: string;
  shot_order: number;
  camera_angle: string;
  shot_size: string;
  panel_type: string;
  shot_description: string;
  composition_hint: string;
  prompt: string;
  generated_image_url?: string | null;
  generation_status?: string;
  created_at: string;
}

/**
 * API 响应类型
 */
interface ShotDetailResponse {
  chapterId: string;
  chapterNumber: number;
  timelineId: string;
  shots: ShotDesign[];
  totalCount: number;
}

interface ShotDetailPanelProps {
  chapterId: string;
}

interface ShotImageCharacterInput {
  name: string;
  role: string;
  description: string;
  reference_image_url?: string;
}

interface GenerateShotImagePayload {
  shotId: string;
  characters: ShotImageCharacterInput[];
  comicStyleId?: string;
}

/**
 * 镜头卡片组件
 */
function ShotCard({
  shot,
  onGenerate,
}: {
  shot: ShotDesign;
  onGenerate: (shot: ShotDesign) => void;
}) {
  const isGenerating = shot.generation_status === 'generating';
  const hasImage = !!shot.generated_image_url;

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors">
      {/* 缩略图区域 */}
      <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border-b border-zinc-700 relative overflow-hidden">
        {hasImage ? (
          <img
            src={shot.generated_image_url || ''}
            alt={`镜头 ${shot.shot_order}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <Camera className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
            <div className="text-xs text-zinc-500">镜头 {shot.shot_order}</div>
          </div>
        )}
        {isGenerating && !hasImage && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-zinc-300">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            生成中...
          </div>
        )}
      </div>

      {/* 镜头信息 */}
      <div className="p-3 space-y-2">
        {/* 参数标签 */}
        <div className="flex flex-wrap gap-1.5">
          <span className="px-2 py-0.5 bg-blue-900/30 border border-blue-800/50 rounded text-xs text-blue-300">
            <Eye className="w-3 h-3 inline mr-1" />
            {shot.camera_angle}
          </span>
          <span className="px-2 py-0.5 bg-purple-900/30 border border-purple-800/50 rounded text-xs text-purple-300">
            <Film className="w-3 h-3 inline mr-1" />
            {shot.shot_size}
          </span>
          <span className="px-2 py-0.5 bg-green-900/30 border border-green-800/50 rounded text-xs text-green-300">
            <Layout className="w-3 h-3 inline mr-1" />
            {shot.panel_type}
          </span>
        </div>

        {/* 镜头描述 */}
        <div className="text-xs text-zinc-400 line-clamp-2">
          {shot.shot_description}
        </div>

        {/* 构图提示 */}
        {shot.composition_hint && (
          <div className="text-xs text-zinc-500 italic line-clamp-1">
            构图: {shot.composition_hint}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onGenerate(shot)}
          disabled={isGenerating}
          className="w-full border-zinc-700 text-zinc-200 hover:bg-zinc-800"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-1" />
              生成图片
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * 镜头详情面板主组件
 */
export function ShotDetailPanel({ chapterId }: ShotDetailPanelProps) {
  const queryClient = useQueryClient();
  const shotGenerateDialog = useShotGenerateDialog();
  const openShotGenerateDialog = useOpenShotGenerateDialog();
  const closeShotGenerateDialog = useCloseShotGenerateDialog();

  // 获取镜头数据
  const { data, isLoading, error } = useQuery<ShotDetailResponse>({
    queryKey: ['shot-detail', chapterId],
    queryFn: async () => {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/shot`);
      if (!response.ok) {
        throw new Error('获取镜头详情失败');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
    // Poll every 3 seconds if there are any shots in generating status
    refetchInterval: (query) => {
      const data = query.state.data as ShotDetailResponse | undefined;

      // Phase 1: 诊断日志
      if (!data?.shots) {
        console.log('[ShotDetail Poll] No data available, stopping poll');
        return false;
      }

      // 统计每种状态的镜头数量
      const statusCounts = data.shots.reduce((acc, shot) => {
        const status = shot.generation_status || 'undefined';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('[ShotDetail Poll] Status distribution:', statusCounts);
      console.log('[ShotDetail Poll] Total shots:', data.shots.length);

      // 找出所有正在生成的镜头
      const generatingShots = data.shots.filter(
        (shot) => shot.generation_status === 'generating'
      );

      if (generatingShots.length > 0) {
        console.log('[ShotDetail Poll] 🔄 Still generating, continuing poll. Shots:',
          generatingShots.map(s => ({
            id: s.id.substring(0, 8),
            order: s.shot_order,
            status: s.generation_status
          }))
        );
        return 3000;
      }

      console.log('[ShotDetail Poll] ✅ No generating shots found, stopping poll');
      return false;
    },
  });

  const generateShotImageMutation = useMutation({
    mutationFn: async ({ shotId, characters, comicStyleId }: GenerateShotImagePayload) => {
      const response = await fetch(`/api/canvas/shot-design/${shotId}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characters,
          comic_style_id: comicStyleId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || '生成失败');
      }
      return response.json() as Promise<{
        success: boolean;
        taskId: string;
        shot: { id: string; generation_status: string };
      }>;
    },
    onMutate: async ({ shotId }) => {
      const previous = queryClient.getQueryData<ShotDetailResponse>(['shot-detail', chapterId]);
      queryClient.setQueryData<ShotDetailResponse>(
        ['shot-detail', chapterId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            shots: old.shots.map((shot) =>
              shot.id === shotId
                ? { ...shot, generation_status: 'generating' }
                : shot
            ),
          };
        }
      );
      closeShotGenerateDialog();
      return { previous };
    },
    onSuccess: () => {
      toast.success('镜头图片生成任务已提交');
      queryClient.invalidateQueries({ queryKey: ['shot-detail', chapterId] });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['shot-detail', chapterId], context.previous);
      }
      toast.error('生成失败', { description: error.message });
    },
  });

  const handleOpenGenerateDialog = (shot: ShotDesign) => {
    if (!data?.timelineId) {
      toast.error('缺少时间线信息，无法生成图片');
      return;
    }
    openShotGenerateDialog(
      shot.id,
      {
        shot_order: shot.shot_order,
        camera_angle: shot.camera_angle,
        shot_size: shot.shot_size,
        shot_description: shot.shot_description,
        panel_type: shot.panel_type,
      },
      chapterId,
      data.timelineId
    );
  };

  const handleConfirmGenerate = (payload: {
    characters: ShotImageCharacterInput[];
    comicStyleId?: string;
  }) => {
    if (!shotGenerateDialog.shotId) {
      toast.error('未找到镜头信息');
      return;
    }
    generateShotImageMutation.mutate({
      shotId: shotGenerateDialog.shotId,
      characters: payload.characters,
      comicStyleId: payload.comicStyleId,
    });
  };

  // 重新生成镜头
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/generate-shots`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('重新生成失败');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('开始重新生成镜头');
      queryClient.invalidateQueries({ queryKey: ['shot-detail', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
    onError: (error: Error) => {
      toast.error('重新生成失败', { description: error.message });
    },
  });

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载镜头设计中...</p>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400">
        <AlertCircle className="w-8 h-8 mb-3" />
        <p className="text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  // 空状态
  if (!data || data.shots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Camera className="w-12 h-12 mb-3 text-zinc-600" />
        <p className="text-sm mb-4">暂无镜头设计</p>
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
              生成镜头
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部统计 */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white mb-1">
              第 {data.chapterNumber} 章镜头
            </h3>
            <p className="text-xs text-zinc-400">
              共 {data.totalCount} 个镜头
            </p>
          </div>
          <Button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            variant="outline"
            size="sm"
            className="border-blue-800/50 text-blue-300 hover:bg-blue-900/30"
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

      {/* 镜头网格 */}
      <div className="grid grid-cols-2 gap-3">
        {data.shots.map((shot) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            onGenerate={handleOpenGenerateDialog}
          />
        ))}
      </div>

      <GenerateShotImageDialog
        open={shotGenerateDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) closeShotGenerateDialog();
        }}
        shotInfo={shotGenerateDialog.shotInfo}
        chapterId={shotGenerateDialog.chapterId}
        timelineId={shotGenerateDialog.timelineId}
        onConfirm={handleConfirmGenerate}
        isSubmitting={generateShotImageMutation.isPending}
      />
    </div>
  );
}
