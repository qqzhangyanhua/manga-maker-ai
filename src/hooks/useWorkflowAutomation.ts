import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCanvasStore } from '@/stores/canvas-store';
import { toast } from 'sonner';
import type { PaginatedTimeline, TimelineChapter } from '@/app/(novel)/novel/components/InfiniteCanvas/types';

/**
 * 章节状态快照
 */
interface ChapterStatusSnapshot {
  id: string;
  script_status: string;
  shot_status: string;
  final_status: string;
}

/**
 * P1-3: 工作流自动化 Hook（重构版）
 *
 * 使用 QueryClient 的 subscribe 机制监听数据变化，
 * 而不是依赖 useEffect 的重新渲染
 *
 * 工作流: script → shot → final
 */
export function useWorkflowAutomation(timelineId: string) {
  const queryClient = useQueryClient();
  const workflowAutomation = useCanvasStore(state => state.workflowAutomation);
  
  // 使用 Map 存储每个章节的上一次状态
  const prevStatusMapRef = useRef<Map<string, ChapterStatusSnapshot>>(new Map());
  
  // 触发中的章节 ID（防止重复触发）
  const pendingTriggersRef = useRef<Set<string>>(new Set());

  // P1-3: 检查状态变化并触发下一阶段
  const checkAndTrigger = useCallback((chapters: TimelineChapter[]) => {
    if (!workflowAutomation.enabled || !workflowAutomation.autoNextStage) {
      return;
    }

    const prevStatusMap = prevStatusMapRef.current;

    chapters.forEach((chapter) => {
      const prevStatus = prevStatusMap.get(chapter.id);
      
      // 首次看到这个章节，只记录状态
      if (!prevStatus) {
        prevStatusMap.set(chapter.id, {
          id: chapter.id,
          script_status: chapter.script_status,
          shot_status: chapter.shot_status,
          final_status: chapter.final_status,
        });
        return;
      }

      // 检查是否已在触发中
      const triggerId = chapter.id;
      if (pendingTriggersRef.current.has(triggerId)) {
        return;
      }

      // 检测状态从 generating → completed
      const stages: Array<{
        key: 'script_status' | 'shot_status' | 'final_status';
        nextStage: 'shot' | 'final' | null;
        label: string;
      }> = [
        { key: 'script_status', nextStage: 'shot', label: '剧本' },
        { key: 'shot_status', nextStage: 'final', label: '镜头' },
        { key: 'final_status', nextStage: null, label: '漫画' },
      ];

      for (const { key, nextStage, label } of stages) {
        const wasGenerating = prevStatus[key] === 'generating';
        const isCompleted = chapter[key] === 'completed';

        // 生成完成且有下一阶段
        if (wasGenerating && isCompleted && nextStage) {
          console.log(`[Workflow Automation] ${label} completed for chapter ${chapter.id}, triggering ${nextStage}...`);

          // 标记为触发中
          pendingTriggersRef.current.add(`${triggerId}-${nextStage}`);

          // 触发下一阶段生成
          triggerNextStage(chapter.id, nextStage).finally(() => {
            // 触发完成后移除标记
            pendingTriggersRef.current.delete(`${triggerId}-${nextStage}`);
          });

          // 显示提示
          toast.success(`${label}生成完成`, {
            description: `自动开始生成${getStageLabel(nextStage)}...`,
          });

          // 每个章节只触发一个阶段
          break;
        }
      }

      // 更新状态快照
      prevStatusMap.set(chapter.id, {
        id: chapter.id,
        script_status: chapter.script_status,
        shot_status: chapter.shot_status,
        final_status: chapter.final_status,
      });
    });
  }, [workflowAutomation.enabled, workflowAutomation.autoNextStage]);

  // P1-3: 使用 QueryClient 的 cache 订阅机制
  useEffect(() => {
    if (!workflowAutomation.enabled) {
      return;
    }

    // 订阅 timeline 查询的缓存变化
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // 只关心 timeline 相关的查询更新
      if (event.type !== 'updated') return;
      
      const queryKey = event.query.queryKey;
      if (!Array.isArray(queryKey) || queryKey[0] !== 'timeline' || queryKey[1] !== timelineId) {
        return;
      }

      // 获取更新后的数据
      const data = event.query.state.data as PaginatedTimeline | undefined;
      if (!data?.chapters) return;

      // 检查并触发
      checkAndTrigger(data.chapters);
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, timelineId, workflowAutomation.enabled, checkAndTrigger]);
}

/**
 * 触发下一阶段生成
 * 
 * P1-3: 返回 Promise 用于状态追踪
 */
async function triggerNextStage(chapterId: string, stage: 'shot' | 'final'): Promise<void> {
  const apiEndpoints = {
    shot: 'generate-shots',
    final: 'generate-finals',
  };

  try {
    const response = await fetch(`/api/canvas/chapter/${chapterId}/${apiEndpoints[stage]}`, {
      method: 'POST',
    });

    if (response.status === 401) {
      throw new Error('请重新登录');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '自动生成失败');
    }
    
    console.log(`[Workflow Automation] Successfully triggered ${stage} for chapter ${chapterId}`);
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
function getStageLabel(stage: 'shot' | 'final'): string {
  const labels = {
    shot: '镜头',
    final: '漫画',
  };
  return labels[stage];
}
