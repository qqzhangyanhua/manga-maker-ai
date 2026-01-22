"use client";

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Image as ImageIcon, Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOpenDetail, useCanvasStore, useOpenSceneDialog } from '@/stores/canvas-store';
import type { GenerationStatus } from '../types';

interface SceneNodeData {
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  status: GenerationStatus;
  count: number;
  canGenerate: boolean;
  timelineId: string;
}

interface SceneNodeProps {
  data: SceneNodeData;
}

const StatusConfig = {
  pending: {
    borderColor: 'border-zinc-700',
    bgColor: 'bg-zinc-900/50',
    icon: ImageIcon,
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

export const SceneNode = memo(({ data }: SceneNodeProps) => {
  const config = StatusConfig[data.status];
  const Icon = config.icon;
  const isGenerating = data.status === 'generating';
  const openDetail = useOpenDetail();
  const openSceneDialog = useOpenSceneDialog();

  const batchMode = useCanvasStore(state => state.batchMode);
  const selectedNodeIds = useCanvasStore(state => state.selectedNodeIds);
  const selectNode = useCanvasStore(state => state.selectNode);
  const isSelected = selectedNodeIds.has(data.chapterId);

  const handleGenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    openSceneDialog(
      data.chapterId,
      data.chapterTitle || `第${data.chapterNumber}章`,
      data.chapterNumber,
      data.timelineId
    );
  };

  const handleClick = (e: React.MouseEvent) => {
    if (batchMode) {
      e.stopPropagation();
      const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
      selectNode(data.chapterId, isMulti);
    } else {
      openDetail('scene', data.chapterId);
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
              <div className="text-sm font-semibold text-white">场景图</div>
              <div className="text-xs text-zinc-400">
                {data.status === 'generating' ? '生成中' : data.status === 'completed' ? '已完成' : '待生成'}
              </div>
            </div>
          </div>

          {/* 内容区域 - 图片预览 */}
          <div className="flex-1 flex flex-col justify-center items-center">
            {data.count > 0 ? (
              <div className="space-y-2 w-full">
                {/* 大图预览框 */}
                <div className="w-full aspect-video rounded bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden">
                  {/* 占位图标 */}
                  <ImageIcon className="w-12 h-12 text-zinc-600" />
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-white">{data.count}</span>
                  <span className="text-xs text-zinc-400 ml-1">张场景图</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-zinc-500 text-sm">
                暂无场景图
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="mt-auto">
            {(data.status === 'pending' || data.status === 'error') && (
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!data.canGenerate}
                className="w-full h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                <Play className="w-3 h-3 mr-1" />
                {data.status === 'error' ? '重新生成' : '生成'}
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

SceneNode.displayName = 'SceneNode';
