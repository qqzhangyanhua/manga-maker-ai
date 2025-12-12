/**
 * React Query Hooks for Story Characters Management
 * 管理故事角色关联关系的数据查询和变更操作
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  StoryCharacterWithDetails,
  CharacterRole,
} from "@/components/StoryCharacter/types";

/**
 * 获取故事角色列表
 */
export function useStoryCharacters(storyId: string) {
  return useQuery<StoryCharacterWithDetails[]>({
    queryKey: ["story-characters", storyId],
    queryFn: async () => {
      const response = await fetch(`/api/story/${storyId}/characters`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "获取故事角色列表失败");
      }

      return data.characters || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * 添加角色到故事
 */
export function useAddStoryCharacter(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      characterId,
      role,
    }: {
      characterId: string;
      role: CharacterRole;
    }) => {
      const response = await fetch(`/api/story/${storyId}/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_id: characterId,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "添加角色失败");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story-characters", storyId] });
    },
  });
}

/**
 * 从故事移除角色
 */
export function useRemoveStoryCharacter(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (characterId: string) => {
      const response = await fetch(
        `/api/story/${storyId}/characters/${characterId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "移除角色失败");
      }

      return data;
    },
    onMutate: async (characterId) => {
      await queryClient.cancelQueries({
        queryKey: ["story-characters", storyId],
      });

      const previousData = queryClient.getQueryData<StoryCharacterWithDetails[]>(
        ["story-characters", storyId]
      );

      // 乐观更新 - 立即从列表中移除
      queryClient.setQueryData<StoryCharacterWithDetails[]>(
        ["story-characters", storyId],
        (old) => (old ? old.filter((sc) => sc.character_id !== characterId) : [])
      );

      return { previousData };
    },
    onError: (err, characterId, context) => {
      // 回滚
      if (context?.previousData) {
        queryClient.setQueryData(
          ["story-characters", storyId],
          context.previousData
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["story-characters", storyId] });
    },
  });
}

/**
 * 更新故事角色的角色类型
 */
export function useUpdateStoryCharacterRole(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      characterId,
      role,
    }: {
      characterId: string;
      role: CharacterRole;
    }) => {
      const response = await fetch(
        `/api/story/${storyId}/characters/${characterId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "更新角色类型失败");
      }

      return data;
    },
    onMutate: async ({ characterId, role }) => {
      await queryClient.cancelQueries({
        queryKey: ["story-characters", storyId],
      });

      const previousData = queryClient.getQueryData<StoryCharacterWithDetails[]>(
        ["story-characters", storyId]
      );

      // 乐观更新
      queryClient.setQueryData<StoryCharacterWithDetails[]>(
        ["story-characters", storyId],
        (old) =>
          old
            ? old.map((sc) =>
                sc.character_id === characterId ? { ...sc, role } : sc
              )
            : []
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["story-characters", storyId],
          context.previousData
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["story-characters", storyId] });
    },
  });
}
