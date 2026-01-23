/**
 * useTimelineConfig Hook
 * 管理时间线配置的 React Query hooks
 * 包括获取配置和更新配置的功能
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CanvasTimelineConfig } from "@/app/(novel)/novel/components/InfiniteCanvas/types";

export interface TimelineData {
  id: string;
  novel_project_id: string;
  user_id: string;
  title: string;
  status: string;
  config: CanvasTimelineConfig;
  total_chapters: number;
  completed_chapters: number;
  total_shots: number;
  total_images: number;
  created_at: string;
  updated_at: string;
}

export interface TimelineResponse {
  success: boolean;
  timeline: TimelineData;
}

export interface UpdateConfigPayload {
  title?: string;
  status?: string;
  config?: Partial<CanvasTimelineConfig>;
}

/**
 * 获取时间线配置
 *
 * @param timelineId - 时间线 ID
 * @returns React Query 结果
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useTimelineConfig(timelineId);
 * const config = data?.timeline.config;
 * ```
 */
export function useTimelineConfig(timelineId: string | null | undefined) {
  return useQuery<TimelineResponse>({
    queryKey: ["timeline-config", timelineId],
    queryFn: async () => {
      if (!timelineId) {
        throw new Error("Timeline ID is required");
      }

      const res = await fetch(`/api/canvas/timeline/${timelineId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "获取时间线配置失败");
      }
      return res.json();
    },
    enabled: !!timelineId,
    staleTime: 60 * 1000, // 1 分钟
  });
}

/**
 * 更新时间线配置（通用版本）
 *
 * @param timelineId - 时间线 ID
 * @returns Mutation 对象
 *
 * @example
 * ```tsx
 * const updateConfig = useUpdateTimelineConfig(timelineId);
 *
 * // 更新配置
 * updateConfig.mutate({
 *   config: { default_comic_style_id: "uuid" }
 * });
 * ```
 */
export function useUpdateTimelineConfig(timelineId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateConfigPayload) => {
      if (!timelineId) {
        throw new Error("Timeline ID is required");
      }

      const res = await fetch(`/api/canvas/timeline/${timelineId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "更新配置失败");
      }

      return res.json() as Promise<TimelineResponse>;
    },
    onMutate: async (payload) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({
        queryKey: ["timeline-config", timelineId],
      });

      // 保存旧数据用于回滚
      const previousData = queryClient.getQueryData<TimelineResponse>([
        "timeline-config",
        timelineId,
      ]);

      // 乐观更新
      if (previousData) {
        queryClient.setQueryData<TimelineResponse>(
          ["timeline-config", timelineId],
          {
            ...previousData,
            timeline: {
              ...previousData.timeline,
              ...(payload.title && { title: payload.title }),
              ...(payload.status && { status: payload.status }),
              ...(payload.config && {
                config: {
                  ...previousData.timeline.config,
                  ...payload.config,
                },
              }),
            },
          }
        );
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // 回滚到之前的数据
      if (context?.previousData) {
        queryClient.setQueryData(
          ["timeline-config", timelineId],
          context.previousData
        );
      }
    },
    onSettled: () => {
      // 重新验证数据 - 需要刷新所有相关的时间线查询
      queryClient.invalidateQueries({
        queryKey: ["timeline-config", timelineId],
      });
      // 刷新 useTimelineWindow 使用的查询键
      queryClient.invalidateQueries({
        queryKey: ["timeline", timelineId],
      });
    },
  });
}

/**
 * 更新时间线默认漫画风格（便捷版本）
 *
 * @param timelineId - 时间线 ID
 * @returns Mutation 对象
 *
 * @example
 * ```tsx
 * const updateStyle = useUpdateTimelineStyle(timelineId);
 *
 * // 设置风格
 * updateStyle.mutate("style-uuid");
 *
 * // 取消设置
 * updateStyle.mutate(null);
 * ```
 */
export function useUpdateTimelineStyle(timelineId: string | null | undefined) {
  const updateConfig = useUpdateTimelineConfig(timelineId);

  return {
    ...updateConfig,
    mutate: (
      styleId: string | null,
      options?: {
        onSuccess?: () => void;
        onError?: (error: Error) => void;
        onSettled?: () => void;
      }
    ) => {
      updateConfig.mutate(
        {
          config: {
            default_comic_style_id: styleId,
          },
        },
        options
      );
    },
    mutateAsync: async (styleId: string | null) => {
      return updateConfig.mutateAsync({
        config: {
          default_comic_style_id: styleId,
        },
      });
    },
  };
}

/**
 * 类型守卫：检查配置是否为有效的 CanvasTimelineConfig
 *
 * @param config - 待检查的配置对象
 * @returns 是否为有效配置
 */
export function isValidTimelineConfig(
  config: unknown
): config is CanvasTimelineConfig {
  if (!config || typeof config !== "object") {
    return false;
  }

  const c = config as Record<string, unknown>;

  return (
    typeof c.auto_generate === "boolean" &&
    typeof c.use_character_library === "boolean" &&
    typeof c.use_scene_library === "boolean"
  );
}

/**
 * 获取安全的配置对象（带默认值）
 *
 * @param config - 原始配置（可能为 null 或无效）
 * @returns 有效的配置对象
 */
export function getSafeConfig(config: unknown): CanvasTimelineConfig {
  // 如果 config 是一个对象，尝试提取字段
  if (config && typeof config === "object") {
    const c = config as Record<string, unknown>;

    return {
      auto_generate: typeof c.auto_generate === "boolean" ? c.auto_generate : true,
      use_character_library: typeof c.use_character_library === "boolean" ? c.use_character_library : true,
      use_scene_library: typeof c.use_scene_library === "boolean" ? c.use_scene_library : true,
      // 保留可选字段
      default_comic_style_id: typeof c.default_comic_style_id === "string" ? c.default_comic_style_id : undefined,
      ai_model: c.ai_model === "gpt-4" || c.ai_model === "gpt-3.5-turbo" ? c.ai_model : undefined,
      shot_density: c.shot_density === "sparse" || c.shot_density === "medium" || c.shot_density === "dense" ? c.shot_density : undefined,
      visual_style: c.visual_style === "manga" || c.visual_style === "realistic" || c.visual_style === "anime" ? c.visual_style : undefined,
      language: c.language === "zh-CN" || c.language === "en-US" ? c.language : undefined,
    };
  }

  // 返回默认配置
  return {
    auto_generate: true,
    use_character_library: true,
    use_scene_library: true,
  };
}
