"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PaginatedTimeline,
  WindowState,
  ChapterSummary,
} from "@/app/(novel)/novel/components/InfiniteCanvas/types";

interface UseTimelineWindowOptions {
  timelineId: string;
  initialCenter?: number;
  range?: number;
}

interface UseTimelineWindowReturn {
  timeline: PaginatedTimeline | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  window: WindowState | undefined;
  chapterSummaries: ChapterSummary[];
  navigateTo: (chapterNumber: number) => void;
  navigatePrev: () => void;
  navigateNext: () => void;
  jumpToFirst: () => void;
  jumpToLast: () => void;
  refresh: () => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
}

const DEFAULT_RANGE = 2;

export function useTimelineWindow({
  timelineId,
  initialCenter = 1,
  range = DEFAULT_RANGE,
}: UseTimelineWindowOptions): UseTimelineWindowReturn {
  const queryClient = useQueryClient();

  // ✅ Hook 内部管理 center 状态（唯一数据源）
  const [center, setCenter] = useState(initialCenter);

  const queryKey = useMemo(
    () => ["timeline", timelineId, { center, range }],
    [timelineId, center, range]
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedTimeline> => {
      const params = new URLSearchParams({
        center: String(center),
        range: String(range),
      });

      const response = await fetch(
        `/api/canvas/timeline/${timelineId}?${params}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "获取时间线失败");
      }

      const result = await response.json();
      return result.timeline;
    },
    enabled: !!timelineId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // ✅ 派生状态：计算导航边界
  const canNavigatePrev = useMemo(() => {
    return data?.window ? data.window.center > 1 : false;
  }, [data?.window]);

  const canNavigateNext = useMemo(() => {
    return data?.window ? data.window.center < data.window.total : false;
  }, [data?.window]);

  // ✅ 导航方法：更新 center 状态即可触发数据重新获取
  const navigateTo = useCallback(
    (chapterNumber: number) => {
      setCenter(chapterNumber);
    },
    []
  );

  const navigatePrev = useCallback(() => {
    if (!canNavigatePrev || !data?.window) return;
    const newCenter = Math.max(1, data.window.center - 1);
    setCenter(newCenter);
  }, [canNavigatePrev, data?.window]);

  const navigateNext = useCallback(() => {
    if (!canNavigateNext || !data?.window) return;
    const newCenter = Math.min(data.window.total, data.window.center + 1);
    setCenter(newCenter);
  }, [canNavigateNext, data?.window]);

  const jumpToFirst = useCallback(() => {
    setCenter(1);
  }, []);

  const jumpToLast = useCallback(() => {
    if (!data?.window?.total) return;
    setCenter(data.window.total);
  }, [data?.window?.total]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    timeline: data,
    isLoading,
    isError,
    error: error as Error | null,
    window: data?.window,
    chapterSummaries: data?.chapter_summaries || [],
    navigateTo,
    navigatePrev,
    navigateNext,
    jumpToFirst,
    jumpToLast,
    refresh,
    canNavigatePrev,
    canNavigateNext,
  };
}
