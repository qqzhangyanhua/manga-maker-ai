/**
 * React Query Hooks for AI Character Generation
 * AI根据故事生成角色的数据操作
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CharacterRole } from "@/components/StoryCharacter/types";

/**
 * 生成的角色数据结构
 */
export interface GeneratedCharacter {
  name: string;
  description: string;
  appearance: string;
  role: CharacterRole;
  image_base64: string;
  optimized_prompt: string;
}

/**
 * 生成角色API响应
 */
export interface GenerateCharactersResult {
  success: boolean;
  generated_characters: GeneratedCharacter[];
  story_context: {
    title: string;
    premise: string;
    genre: string;
  };
  credits_used: number;
}

/**
 * 保存角色的输入数据
 */
export interface SaveCharacterInput {
  name: string;
  description: string;
  base_prompt: string;
  role: CharacterRole;
  image_base64: string;
  comic_style_id?: string;
}

/**
 * 保存角色API响应
 */
export interface SaveCharactersResult {
  success: boolean;
  saved_count: number;
  characters: Array<{
    character_id: string;
    name: string;
    role: CharacterRole;
    image_url: string;
  }>;
}

/**
 * 根据故事AI生成角色
 */
export function useGenerateStoryCharacters(storyId: string) {
  return useMutation<
    GenerateCharactersResult,
    Error,
    { count?: number; styleHints?: string; comic_style_id?: string }
  >({
    mutationFn: async (params) => {
      const response = await fetch(`/api/story/${storyId}/generate-characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: params.count ?? 3,
          style_hints: params.styleHints,
          comic_style_id: params.comic_style_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成角色失败");
      }

      return data;
    },
  });
}

/**
 * 保存AI生成的角色到角色库并关联故事
 */
export function useSaveGeneratedCharacters(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation<SaveCharactersResult, Error, SaveCharacterInput[]>({
    mutationFn: async (characters) => {
      const response = await fetch(
        `/api/story/${storyId}/save-generated-characters`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ characters }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "保存角色失败");
      }

      return data;
    },
    onSuccess: () => {
      // 刷新故事角色列表
      queryClient.invalidateQueries({ queryKey: ["story-characters", storyId] });
      // 刷新角色库
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}
