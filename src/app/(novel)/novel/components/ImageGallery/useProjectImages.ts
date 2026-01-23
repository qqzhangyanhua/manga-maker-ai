/**
 * 项目图片数据获取 Hook
 */

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { ProjectImagesResponse, ImageType } from "./types";

interface UseProjectImagesOptions {
  projectId: string;
  type?: ImageType | "all";
  chapterId?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * 获取项目图片（分页）
 */
export function useProjectImages({
  projectId,
  type = "all",
  chapterId,
  limit = 50,
  enabled = true,
}: UseProjectImagesOptions) {
  return useInfiniteQuery<ProjectImagesResponse>({
    queryKey: ["project-images", projectId, type, chapterId, limit],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("page", String(pageParam));
      params.set("limit", String(limit));
      if (type && type !== "all") {
        params.set("type", type);
      }
      if (chapterId) {
        params.set("chapterId", chapterId);
      }

      const response = await fetch(
        `/api/novel/${projectId}/images?${params.toString()}`
      );

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || "获取图片失败");
      }

      return response.json() as Promise<ProjectImagesResponse>;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 2, // 2 分钟
  });
}

/**
 * 获取项目图片统计
 */
export function useProjectImageStats(projectId: string, enabled = true) {
  return useQuery({
    queryKey: ["project-images-stats", projectId],
    queryFn: async () => {
      // 获取第一页数据以获取总数
      const response = await fetch(
        `/api/novel/${projectId}/images?page=1&limit=1`
      );

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || "获取图片统计失败");
      }

      const data = (await response.json()) as ProjectImagesResponse;
      return { total: data.total };
    },
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 5, // 5 分钟
  });
}
