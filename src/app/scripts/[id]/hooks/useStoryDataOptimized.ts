/**
 * 浼樺寲鐗堢殑鏁呬簨鏁版嵁鍔犺浇 Hook
 * 瀹炵幇娓愯繘寮忓姞杞?浼樺厛鍔犺浇鏁呬簨淇℃伅,寤惰繜鍔犺浇鍒嗛暅鍒楄〃
 */

import { useQuery } from '@tanstack/react-query';
import type { Story, Panel } from '../types/script-editor.types';

interface Chapter {
  id: string;
  title: string;
  summary: string | null;
  chapter_order: number;
  publish_status: string;
  published_at: string | null;
  created_at: string;
}

interface StoryBasicData {
  story: Story;
  projectId: string | null;
  chapters: Chapter[];
}

interface PanelsData {
  panels: Panel[];
  projectId: string | null;
}

/**
 * 绗竴闃舵:鍔犺浇鏁呬簨鍩烘湰淇℃伅(鏈€蹇?
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
        chapters: data.chapters || [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5鍒嗛挓缂撳瓨
    gcTime: 10 * 60 * 1000, // 10鍒嗛挓鍨冨溇鍥炴敹
  });
}

/**
 * 绗簩闃舵:鍔犺浇鍒嗛暅鍒楄〃(寤惰繜鍔犺浇)
 */
export function useStoryPanels(storyId: string, enabled = true) {
  return useQuery<PanelsData>({
    queryKey: ['story-panels', storyId],
    queryFn: async () => {
      const response = await fetch(`/api/story/${storyId}/panels`);
      
      if (!response.ok) {
        // 鎶涘嚭閿欒,鐢变笂灞傜粺涓€鎻愮ず,閬垮厤闈欓粯澶辫触
        throw new Error('Failed to load panels');
      }

      const data = await response.json();
      
      return {
        panels: data.panels || [],
        projectId: data.projectId || null,
      };
    },
    enabled, // 鍙帶鍒舵槸鍚﹀紑濮嬪姞杞?
    staleTime: 2 * 60 * 1000, // 2鍒嗛挓缂撳瓨
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * 缁勫悎 Hook:鎻愪緵瀹屾暣鐨勬暟鎹闂帴鍙?
 */
export function useStoryDataOptimized(storyId: string) {
  // 浼樺厛鍔犺浇鏁呬簨淇℃伅
  const {
    data: basicData,
    isLoading: isStoryLoading,
    error: storyError,
    refetch: refetchStory
  } = useStoryBasicData(storyId);

  // 寤惰繜鍔犺浇鍒嗛暅鍒楄〃
  const {
    data: panelsData,
    isLoading: isPanelsLoading,
    error: panelsError,
    refetch: refetchPanels,
  } = useStoryPanels(storyId, !!basicData);

  // 鍚堝苟鏁版嵁
  const story = basicData?.story;
  const panels = panelsData?.panels || [];
  const projectId = panelsData?.projectId || basicData?.projectId || null;
  const chapters = basicData?.chapters || [];

  return {
    data: story ? {
      story,
      panels,
      projectId,
      chapters,
    } : undefined,
    isLoading: isStoryLoading,
    isPanelsLoading,
    error: storyError || panelsError,
    hasStory: !!story,
    hasPanels: panels.length > 0,
    refetchPanels,
  };
}


