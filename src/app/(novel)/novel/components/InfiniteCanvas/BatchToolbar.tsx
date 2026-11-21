import { useState } from 'react';
import { X, Play, Trash2, Loader2, FileText, Camera, Image, BookImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/stores/canvas-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type Stage = 'script' | 'shot' | 'scene' | 'final';

const STAGE_CONFIG = {
  script: { label: '剧本', icon: FileText, color: 'text-blue-400' },
  shot: { label: '镜头', icon: Camera, color: 'text-purple-400' },
  scene: { label: '场景', icon: Image, color: 'text-green-400' },
  final: { label: '漫画', icon: BookImage, color: 'text-pink-400' },
} as const;

export function BatchToolbar() {
  const selectedNodeIds = useCanvasStore(state => state.selectedNodeIds);
  const clearSelection = useCanvasStore(state => state.clearSelection);
  const batchMode = useCanvasStore(state => state.batchMode);
  const queryClient = useQueryClient();

  const [selectedStage, setSelectedStage] = useState<Stage>('script');

  const selectedCount = selectedNodeIds.size;
  const chapterIds = Array.from(selectedNodeIds);

  // 批量生成 Mutation
  const batchGenerateMutation = useMutation({
    mutationFn: async (stage: Stage) => {
      const response = await fetch('/api/canvas/batch/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterIds, stage }),
      });

      if (response.status === 401) {
        throw new Error('请重新登录');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '批量生成失败');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const { succeeded, failed, errors } = data;

      if (failed > 0) {
        toast.error(`批量生成完成`, {
          description: `成功 ${succeeded} 个，失败 ${failed} 个`,
        });
        console.error('[Batch Generate] Errors:', errors);
      } else {
        toast.success(`批量生成成功`, {
          description: `${succeeded} 个章节已开始生成`,
        });
      }

      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      clearSelection();
    },
    onError: (error: Error) => {
      toast.error('批量生成失败', { description: error.message });
    },
  });

  const handleBatchGenerate = () => {
    batchGenerateMutation.mutate(selectedStage);
  };

  if (!batchMode || selectedCount === 0) {
    return null;
  }

  const StageIcon = STAGE_CONFIG[selectedStage].icon;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-zinc-900 border-2 border-purple-500 rounded-lg shadow-2xl p-4 flex items-center gap-4">
        {/* 选中数量 */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
            {selectedCount}
          </div>
          <span className="text-sm text-zinc-300">个节点已选中</span>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-8 bg-zinc-700" />

        {/* 阶段选择 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">生成阶段:</span>
          <div className="flex gap-1">
            {(Object.keys(STAGE_CONFIG) as Stage[]).map((stage) => {
              const config = STAGE_CONFIG[stage];
              const Icon = config.icon;
              const isSelected = selectedStage === stage;

              return (
                <button
                  key={stage}
                  onClick={() => setSelectedStage(stage)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                    isSelected
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                  disabled={batchGenerateMutation.isPending}
                >
                  <Icon className="w-3 h-3" />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-8 bg-zinc-700" />

        {/* 批量操作按钮 */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleBatchGenerate}
            disabled={batchGenerateMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white disabled:bg-zinc-700"
          >
            {batchGenerateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                批量生成
              </>
            )}
          </Button>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-8 bg-zinc-700" />

        {/* 取消选择 */}
        <Button
          size="sm"
          variant="ghost"
          onClick={clearSelection}
          disabled={batchGenerateMutation.isPending}
          className="text-zinc-400 hover:text-white"
        >
          <X className="w-4 h-4 mr-1" />
          取消选择
        </Button>
      </div>
    </div>
  );
}
