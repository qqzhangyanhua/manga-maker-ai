/**
 * 优化版的分镜数据 Hook
 * 支持分页加载、按章节过滤、局部更新
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { Panel } from '../types/script-editor.types';

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface PanelsResponse {
  data: Panel[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  projectId: string | null;
}

/**
 * 获取分镜列表（支持分页和过滤）
 */
export function useOptimizedPanels(
  storyId: string,
  options?: {
    chapterId?: string | null;
    page?: number;
    pageSize?: number;
    enabled?: boolean;
  }
) {
  const queryClient = useQueryClient();
  
  const {
    chapterId,
    page = 1,
    pageSize = 20,
    enabled = true,
  } = options || {};

  // 构建查询参数
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  
  if (chapterId) {
    params.append('chapter_id', chapterId);
  }

  // 查询数据
  const query = useQuery<PanelsResponse>({
    queryKey: ['story-panels-optimized', storyId, chapterId, page, pageSize],
    queryFn: async () => {
      const response = await fetch(
        `/api/story/${storyId}/panels-optimized?${params.toString()}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '获取分镜列表失败');
      }

      return response.json();
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  /**
   * 局部更新单个分镜（避免重新请求整个列表）
   */
  const updatePanelInCache = useCallback((
    panelId: string,
    updates: Partial<Panel>
  ) => {
    queryClient.setQueriesData<PanelsResponse>(
      { queryKey: ['story-panels-optimized', storyId] },
      (old) => {
        if (!old) return old;

        return {
          ...old,
          data: old.data.map(panel =>
            panel.id === panelId ? { ...panel, ...updates } : panel
          ),
        };
      }
    );
  }, [queryClient, storyId]);

  /**
   * 添加新分镜到缓存
   */
  const addPanelToCache = useCallback((newPanel: Panel) => {
    queryClient.setQueriesData<PanelsResponse>(
      { queryKey: ['story-panels-optimized', storyId] },
      (old) => {
        if (!old) return old;

        return {
          ...old,
          data: [...old.data, newPanel],
          pagination: {
            ...old.pagination,
            total: old.pagination.total + 1,
          },
        };
      }
    );
  }, [queryClient, storyId]);

  /**
   * 从缓存中删除分镜
   */
  const removePanelFromCache = useCallback((panelId: string) => {
    queryClient.setQueriesData<PanelsResponse>(
      { queryKey: ['story-panels-optimized', storyId] },
      (old) => {
        if (!old) return old;

        return {
          ...old,
          data: old.data.filter(panel => panel.id !== panelId),
          pagination: {
            ...old.pagination,
            total: old.pagination.total - 1,
          },
        };
      }
    );
  }, [queryClient, storyId]);

  /**
   * 刷新当前页
   */
  const refresh = useCallback(() => {
    return query.refetch();
  }, [query]);

  /**
   * 预加载下一页
   */
  const prefetchNextPage = useCallback(() => {
    if (!query.data?.pagination.hasNext) return;

    const nextParams = new URLSearchParams({
      page: String(page + 1),
      pageSize: String(pageSize),
    });
    
    if (chapterId) {
      nextParams.append('chapter_id', chapterId);
    }

    queryClient.prefetchQuery({
      queryKey: ['story-panels-optimized', storyId, chapterId, page + 1, pageSize],
      queryFn: async () => {
        const response = await fetch(
          `/api/story/${storyId}/panels-optimized?${nextParams.toString()}`
        );
        return response.json();
      },
    });
  }, [queryClient, storyId, chapterId, page, pageSize, query.data]);

  return {
    // 查询结果
    panels: query.data?.data || [],
    pagination: query.data?.pagination,
    projectId: query.data?.projectId || null,
    
    // 状态
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    
    // 操作方法
    updatePanelInCache,
    addPanelToCache,
    removePanelFromCache,
    refresh,
    prefetchNextPage,
  };
}

