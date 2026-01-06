/**
 * React Query Hooks for AI Character Generation
 * AI根据故事生成角色的数据操作
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CharacterRole } from "@/components/StoryCharacter/types";
import type { SuggestedCharacterResponse } from "@/types/suggested-characters.types";

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

// ============================
// 两步生成流程的新 Hooks
// ============================

/**
 * 第一步：分析故事并生成建议角色列表（仅文本，无图片）
 */
export interface AnalyzeCharactersResult {
  success: boolean;
  suggested_characters: SuggestedCharacterResponse[];
  story_context: {
    title: string;
    premise: string;
    genre: string;
  };
  credits_used: number;
  from_cache?: boolean;
}

export function useAnalyzeCharacters(storyId: string) {
  return useMutation<
    AnalyzeCharactersResult,
    Error,
    { count?: number; comic_style_id?: string; force_regenerate?: boolean }
  >({
    mutationFn: async (params) => {
      const response = await fetch(`/api/story/${storyId}/analyze-characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "分析角色失败");
      }

      return data;
    },
  });
}

/**
 * 第二步:批量为建议角色生成图片并保存到角色库
 */
export interface BatchGenerateImagesResult {
  success: boolean;
  results: Array<{
    id: string; // Changed from temp_id to id
    success: boolean;
    image_base64?: string;
    optimized_prompt?: string;
    character_id?: string;
    error?: string;
  }>;
  saved_count: number;
  credits_used: number;
}

export function useBatchGenerateImages(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    BatchGenerateImagesResult,
    Error,
    { temp_ids: string[]; auto_save?: boolean; comic_style_id?: string }
  >({
    mutationFn: async (params) => {
      const response = await fetch(`/api/story/${storyId}/batch-generate-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "批量生成失败");
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

/**
 * 重新生成角色图片（快速模式或自定义变化）
 */
export interface RegenerateImageResult {
  success: boolean;
  image_base64: string;
  optimized_prompt: string;
  credits_used: number;
}

export function useRegenerateCharacterImage() {
  const queryClient = useQueryClient();

  return useMutation<
    RegenerateImageResult,
    Error,
    { characterId: string; mode: "fast" | "variation"; variation_prompt?: string }
  >({
    mutationFn: async (params) => {
      const { characterId, ...body } = params;
      const response = await fetch(`/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "重新生成失败");
      }

      return data;
    },
    onSuccess: () => {
      // 刷新角色库
      queryClient.invalidateQueries({ queryKey: ["characters"] });
    },
  });
}
