import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCanvasStore } from '@/stores/canvas-store';
import { toast } from 'sonner';
import type { CanvasTimeline } from '@/components/InfiniteCanvas/types';

/**
 * 工作流自动化 Hook
 *
 * 监听章节生成完成事件，自动触发下一阶段
 *
 * 工作流: script → shot → scene → final
 */
export function useWorkflowAutomation(timelineId: string) {
  const queryClient = useQueryClient();
  const workflowAutomation = useCanvasStore(state => state.workflowAutomation);
  const prevTimelineRef = useRef<CanvasTimeline | null>(null);

  useEffect(() => {
    if (!workflowAutomation.enabled || !workflowAutomation.autoNextStage) {
      return;
    }

    // 获取当前时间轴数据
    const currentTimeline = queryClient.getQueryData<CanvasTimeline>(['timeline', timelineId]);
    if (!currentTimeline) return;

    const prevTimeline = prevTimelineRef.current;

    // 如果没有之前的数据，存储当前状态
    if (!prevTimeline) {
      prevTimelineRef.current = currentTimeline;
      return;
    }

    // 检查每个章节的状态变化
    currentTimeline.chapters.forEach((currentChapter) => {
      const prevChapter = prevTimeline.chapters.find(ch => ch.id === currentChapter.id);
      if (!prevChapter) return;

      // 检测状态从 generating → completed
      const stages: Array<{
        key: 'script_status' | 'shot_status' | 'scene_status' | 'final_status';
        nextStage: 'shot' | 'scene' | 'final' | null;
        label: string;
      }> = [
        { key: 'script_status', nextStage: 'shot', label: '剧本' },
        { key: 'shot_status', nextStage: 'scene', label: '镜头' },
        { key: 'scene_status', nextStage: 'final', label: '场景' },
        { key: 'final_status', nextStage: null, label: '漫画' },
      ];

      stages.forEach(({ key, nextStage, label }) => {
        const wasGenerating = prevChapter[key] === 'generating';
        const isCompleted = currentChapter[key] === 'completed';

        // 生成完成且有下一阶段
        if (wasGenerating && isCompleted && nextStage) {
          console.log(`[Workflow Automation] ${label} completed, triggering ${nextStage}...`);

          // 触发下一阶段生成
          triggerNextStage(currentChapter.id, nextStage);

          // 显示提示
          toast.success(`${label}生成完成`, {
            description: `自动开始生成${getStageLabel(nextStage)}...`,
          });
        }
      });
    });

    // 更新引用
    prevTimelineRef.current = currentTimeline;
  }, [queryClient, timelineId, workflowAutomation.enabled, workflowAutomation.autoNextStage]);
}

/**
 * 触发下一阶段生成
 */
async function triggerNextStage(chapterId: string, stage: 'shot' | 'scene' | 'final') {
  const apiEndpoints = {
    shot: 'generate-shots',
    scene: 'generate-scenes',
    final: 'generate-finals',
  };

  try {
    const response = await fetch(`/api/canvas/chapter/${chapterId}/${apiEndpoints[stage]}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '自动生成失败');
    }
  } catch (error) {
    console.error(`[Workflow Automation] Failed to trigger ${stage}:`, error);
    toast.error(`自动生成${getStageLabel(stage)}失败`, {
      description: error instanceof Error ? error.message : '请手动重试',
    });
  }
}

/**
 * 获取阶段中文标签
 */
function getStageLabel(stage: 'shot' | 'scene' | 'final'): string {
  const labels = {
    shot: '镜头',
    scene: '场景图',
    final: '漫画',
  };
  return labels[stage];
}
