"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PaginatedTimeline,
  WindowState,
  ChapterSummary,
} from "@/components/InfiniteCanvas/types";

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
}

const DEFAULT_RANGE = 2;

export function useTimelineWindow({
  timelineId,
  initialCenter = 1,
  range = DEFAULT_RANGE,
}: UseTimelineWindowOptions): UseTimelineWindowReturn {
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ["timeline", timelineId, { center: initialCenter, range }],
    [timelineId, initialCenter, range]
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedTimeline> => {
      const params = new URLSearchParams({
        center: String(initialCenter),
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

  const navigateTo = useCallback(
    (chapterNumber: number) => {
      const newQueryKey = ["timeline", timelineId, { center: chapterNumber, range }];
      queryClient.prefetchQuery({
        queryKey: newQueryKey,
        queryFn: async (): Promise<PaginatedTimeline> => {
          const params = new URLSearchParams({
            center: String(chapterNumber),
            range: String(range),
          });

          const response = await fetch(
            `/api/canvas/timeline/${timelineId}?${params}`
          );

          if (!response.ok) {
            throw new Error("获取时间线失败");
          }

          const result = await response.json();
          return result.timeline;
        },
      });
    },
    [timelineId, range, queryClient]
  );

  const navigatePrev = useCallback(() => {
    if (!data?.window) return;
    const { center, start } = data.window;
    if (start <= 1) return;

    const newCenter = Math.max(1, center - 1);
    navigateTo(newCenter);
  }, [data?.window, navigateTo]);

  const navigateNext = useCallback(() => {
    if (!data?.window) return;
    const { center, end, total } = data.window;
    if (end >= total) return;

    const newCenter = Math.min(total, center + 1);
    navigateTo(newCenter);
  }, [data?.window, navigateTo]);

  const jumpToFirst = useCallback(() => {
    navigateTo(1);
  }, [navigateTo]);

  const jumpToLast = useCallback(() => {
    if (!data?.window?.total) return;
    navigateTo(data.window.total);
  }, [data?.window?.total, navigateTo]);

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
  };
}
