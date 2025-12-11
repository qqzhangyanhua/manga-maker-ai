/**
 * 优化版的故事数据加载 Hook
 * 实现渐进式加载:优先加载故事信息,延迟加载分镜列表
 */

import { useQuery } from '@tanstack/react-query';
import type { Story, Panel } from '../types/script-editor.types';

interface StoryBasicData {
  story: Story;
  projectId: string | null;
}

interface PanelsData {
  panels: Panel[];
  projectId: string | null;
}

/**
 * 第一阶段:加载故事基本信息(最快)
 */
export function useStoryBasicData(storyId: string) {
  return useQuery<StoryBasicData>({
    queryKey: ['story-basic', storyId],
    queryFn: async () => {
      const response = await fetch(`/api/story/${storyId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load story');
      }

      const data = await response.json();
      
      return {
        story: data.story,
        projectId: data.projectId || null,
      };
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    gcTime: 10 * 60 * 1000, // 10分钟垃圾回收
  });
}

/**
 * 第二阶段:加载分镜列表(延迟加载)
 */
export function useStoryPanels(storyId: string, enabled = true) {
  return useQuery<PanelsData>({
    queryKey: ['story-panels', storyId],
    queryFn: async () => {
      const response = await fetch(`/api/story/${storyId}/panels`);
      
      if (!response.ok) {
        // 抛出错误,由上层统一提示,避免静默失败
        throw new Error('Failed to load panels');
      }

      const data = await response.json();
      
      return {
        panels: data.panels || [],
        projectId: data.projectId || null,
      };
    },
    enabled, // 可控制是否开始加载
    staleTime: 2 * 60 * 1000, // 2分钟缓存
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * 组合 Hook:提供完整的数据访问接口
 */
export function useStoryDataOptimized(storyId: string) {
  // 优先加载故事信息
  const { 
    data: basicData, 
    isLoading: isStoryLoading, 
    error: storyError 
  } = useStoryBasicData(storyId);

  // 延迟加载分镜列表
  const { 
    data: panelsData, 
    isLoading: isPanelsLoading,
    error: panelsError,
    refetch: refetchPanels,
  } = useStoryPanels(storyId, !!basicData);

  // 合并数据
  const story = basicData?.story;
  const panels = panelsData?.panels || [];
  const projectId = panelsData?.projectId || basicData?.projectId || null;

  return {
    data: story ? {
      story,
      panels,
      projectId,
    } : undefined,
    isLoading: isStoryLoading,
    isPanelsLoading,
    error: storyError || panelsError,
    hasStory: !!story,
    hasPanels: panels.length > 0,
    refetchPanels,
  };
}
