/**
 * 章节版本管理 React Query Hooks
 * 提供版本 CRUD 操作和状态管理
 */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  ChapterVersion,
  CreateVersionRequest,
  UpdateVersionRequest,
} from "../types/version";
import * as versionService from "../services/versionService";

/**
 * 查询键工厂
 */
export const versionQueryKeys = {
  all: ["chapter-versions"] as const,
  byChapter: (chapterId: string) => [...versionQueryKeys.all, chapterId] as const,
};

/**
 * 获取章节所有版本列表
 */
export function useChapterVersions(chapterId: string | null) {
  return useQuery({
    queryKey: versionQueryKeys.byChapter(chapterId || ""),
    queryFn: () => versionService.fetchChapterVersions(chapterId!),
    enabled: !!chapterId,
    staleTime: 30000, // 30秒内不重新请求
  });
}

/**
 * 创建新版本
 */
export function useCreateVersion(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateVersionRequest) =>
      versionService.createChapterVersion(chapterId, request),

    onSuccess: (newVersion) => {
      // 更新缓存
      queryClient.setQueryData<ChapterVersion[]>(
        versionQueryKeys.byChapter(chapterId),
        (old) => (old ? [newVersion, ...old] : [newVersion])
      );
      toast.success(`版本 v${newVersion.version_number} 已创建`);
    },

    onError: (error: Error) => {
      toast.error(error.message || "创建版本失败");
    },
  });
}

/**
 * 更新版本信息
 */
export function useUpdateVersion(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      versionId,
      request,
    }: {
      versionId: string;
      request: UpdateVersionRequest;
    }) => versionService.updateChapterVersion(versionId, request),

    // 乐观更新
    onMutate: async ({ versionId, request }) => {
      await queryClient.cancelQueries({
        queryKey: versionQueryKeys.byChapter(chapterId),
      });

      const previousVersions = queryClient.getQueryData<ChapterVersion[]>(
        versionQueryKeys.byChapter(chapterId)
      );

      // 乐观更新缓存
      queryClient.setQueryData<ChapterVersion[]>(
        versionQueryKeys.byChapter(chapterId),
        (old) =>
          old?.map((v) => {
            if (v.id === versionId) {
              return { ...v, ...request };
            }
            // 如果设置为选中,取消其他版本的选中状态
            if (request.is_selected && v.is_selected) {
              return { ...v, is_selected: false };
            }
            return v;
          })
      );

      return { previousVersions };
    },

    onError: (error: Error, variables, context) => {
      // 回滚
      if (context?.previousVersions) {
        queryClient.setQueryData(
          versionQueryKeys.byChapter(chapterId),
          context.previousVersions
        );
      }
      toast.error(error.message || "更新版本失败");
    },

    onSuccess: (updatedVersion) => {
      // 确保数据一致性
      queryClient.invalidateQueries({
        queryKey: versionQueryKeys.byChapter(chapterId),
      });
    },
  });
}

/**
 * 删除版本
 */
export function useDeleteVersion(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => versionService.deleteChapterVersion(versionId),

    // 乐观更新
    onMutate: async (versionId) => {
      await queryClient.cancelQueries({
        queryKey: versionQueryKeys.byChapter(chapterId),
      });

      const previousVersions = queryClient.getQueryData<ChapterVersion[]>(
        versionQueryKeys.byChapter(chapterId)
      );

      // 乐观删除
      queryClient.setQueryData<ChapterVersion[]>(
        versionQueryKeys.byChapter(chapterId),
        (old) => old?.filter((v) => v.id !== versionId)
      );

      return { previousVersions };
    },

    onError: (error: Error, variables, context) => {
      // 回滚
      if (context?.previousVersions) {
        queryClient.setQueryData(
          versionQueryKeys.byChapter(chapterId),
          context.previousVersions
        );
      }
      toast.error(error.message || "删除版本失败");
    },

    onSuccess: () => {
      toast.success("版本已删除");
    },
  });
}

/**
 * 分析版本质量
 */
export function useAnalyzeVersion(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => versionService.analyzeVersionQuality(versionId),

    onSuccess: (qualityScore, versionId) => {
      // 更新版本的质量评分
      queryClient.setQueryData<ChapterVersion[]>(
        versionQueryKeys.byChapter(chapterId),
        (old) =>
          old?.map((v) =>
            v.id === versionId ? { ...v, quality_score: qualityScore } : v
          )
      );
      toast.success(`质量分析完成: ${qualityScore.overall_score} 分`);
    },

    onError: (error: Error) => {
      toast.error(error.message || "质量分析失败");
    },
  });
}
