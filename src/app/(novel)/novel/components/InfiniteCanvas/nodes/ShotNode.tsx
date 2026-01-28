"use client";

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Camera, Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOpenDetail, useCanvasStore } from '@/stores/canvas-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ShotNodeData } from '../nodes-types';

interface ShotNodeProps {
  data: ShotNodeData;
}

const StatusConfig = {
  pending: {
    borderColor: 'border-zinc-700',
    bgColor: 'bg-zinc-900/50',
    icon: Camera,
    iconColor: 'text-zinc-500',
    glowClass: '',
  },
  generating: {
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-900/20',
    icon: Loader2,
    iconColor: 'text-purple-400',
    glowClass: 'ring-4 ring-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.4)]',
  },
  completed: {
    borderColor: 'border-green-500',
    bgColor: 'bg-green-900/10',
    icon: CheckCircle,
    iconColor: 'text-green-400',
    glowClass: '',
  },
  error: {
    borderColor: 'border-red-500',
    bgColor: 'bg-red-900/10',
    icon: AlertCircle,
    iconColor: 'text-red-400',
    glowClass: '',
  },
};

export const ShotNode = memo(({ data }: ShotNodeProps) => {
  const config = StatusConfig[data.status];
  const Icon = config.icon;
  const isGenerating = data.status === 'generating';
  const openDetail = useOpenDetail();
  const queryClient = useQueryClient();

  // 批量模式和选中状态
  const batchMode = useCanvasStore(state => state.batchMode);
  const selectedNodeIds = useCanvasStore(state => state.selectedNodeIds);
  const selectNode = useCanvasStore(state => state.selectNode);
  const isSelected = selectedNodeIds.has(data.chapterId);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/canvas/chapter/${data.chapterId}/generate-shots`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成失败');
      }
      return response.json();
    },
    onMutate: async () => {
      // 乐观更新: 立即显示 generating 状态
      // 使用模糊匹配更新所有以 ["timeline", timelineId] 开头的查询
      await queryClient.cancelQueries({ queryKey: ['timeline', data.timelineId] });

      // 获取所有匹配的查询并保存之前的数据
      const queries = queryClient.getQueriesData({ queryKey: ['timeline', data.timelineId] });
      const previousDataMap = new Map(queries);

      // 更新所有匹配的查询缓存
      queryClient.setQueriesData(
        { queryKey: ['timeline', data.timelineId] },
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const timeline = old as { chapters?: Array<{ id: string; shot_status: string }> };
          if (!timeline.chapters) return old;
          return {
            ...timeline,
            chapters: timeline.chapters.map((ch) =>
              ch.id === data.chapterId
                ? { ...ch, shot_status: 'generating' }
                : ch
            ),
          };
        }
      );

      return { previousDataMap };
    },
    onSuccess: async (responseData) => {
      toast.success('镜头生成成功');

      // 立即更新缓存为最终状态
      queryClient.setQueriesData(
        { queryKey: ['timeline', data.timelineId] },
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const timeline = old as { chapters?: Array<{ id: string; shot_status: string; shot_count: number }> };
          if (!timeline.chapters) return old;
          return {
            ...timeline,
            chapters: timeline.chapters.map((ch) =>
              ch.id === data.chapterId
                ? {
                    ...ch,
                    shot_status: 'completed',
                    shot_count: responseData.metadata?.shot_count || 0,
                  }
                : ch
            ),
          };
        }
      );

      // 强制刷新数据以确保与数据库同步
      await queryClient.refetchQueries({ queryKey: ['timeline', data.timelineId] });
    },
    onError: (error: Error, _variables, context) => {
      toast.error('镜头生成失败', { description: error.message });
      // 回滚到之前的数据
      if (context?.previousDataMap) {
        context.previousDataMap.forEach((data, key) => {
          queryClient.setQueryData(key as string[], data);
        });
      }
    },
  });

  const handleGenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    generateMutation.mutate();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (batchMode) {
      e.stopPropagation();
      const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
      selectNode(data.chapterId, isMulti);
    } else {
      openDetail('shot', data.chapterId);
    }
  };

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-zinc-500 border-2 border-white"
      />

      <div
        className={`w-[200px] h-[220px] rounded-lg border-2 ${config.borderColor} ${config.bgColor} transition-all duration-300 shadow-lg overflow-hidden cursor-pointer hover:shadow-xl ${config.glowClass} ${
          isSelected ? 'ring-4 ring-blue-500 ring-opacity-50 scale-105' : ''
        }`}
        onClick={handleClick}
      >
        {isGenerating && (
          <div className="absolute inset-0 bg-purple-500/20 animate-pulse" />
        )}

        <div className="relative z-10 p-4 h-full flex flex-col">
          {/* 头部 */}
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-5 h-5 ${config.iconColor} ${isGenerating ? 'animate-spin' : ''}`} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">镜头</div>
              <div className="text-xs text-zinc-400">
                {data.status === 'generating' ? '生成中' : data.status === 'completed' ? '已完成' : '待生成'}
              </div>
            </div>
          </div>

          {/* 内容区域 - 缩略图网格 */}
          <div className="flex-1 flex flex-col justify-center items-center">
            {data.count > 0 ? (
              <div className="space-y-2 w-full">
                {/* 2x2 缩略图网格预览 */}
                <div className="grid grid-cols-2 gap-1.5 max-w-[120px] mx-auto">
                  {[...Array(Math.min(4, data.count))].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center"
                    >
                      <Camera className="w-4 h-4 text-zinc-600" />
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold text-white">{data.count}</span>
                  <span className="text-xs text-zinc-400 ml-1">个镜头</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-zinc-500 text-sm">
                暂无镜头
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="mt-auto">
            {(data.status === 'pending' || data.status === 'error') && (
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!data.canGenerate || generateMutation.isPending}
                className="w-full h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    {data.status === 'error' ? '重新生成' : '生成'}
                  </>
                )}
              </Button>
            )}
            {data.status === 'generating' && (
              <div className="h-8 flex items-center justify-center text-xs text-purple-400">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                生成中...
              </div>
            )}
            {data.status === 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full h-8 text-xs text-zinc-400 hover:text-white"
              >
                查看详情
              </Button>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
      />
    </div>
  );
});

ShotNode.displayName = 'ShotNode';
