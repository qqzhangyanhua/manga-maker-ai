/**
 * useCharacterPreparation - 角色准备相关的 Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ChapterCharacter {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
  source_type: "manual" | "novel" | "story_ai" | "imported" | null;
}

interface NovelCharacter {
  name: string;
  role: string;
  description: string;
  tempId: string;
  traits?: string[];
  relationships?: Record<string, string>;
}

interface UpgradeCharacterRequest {
  novelCharacter: NovelCharacter;
  generateImage?: boolean;
  comicStyleId?: string;
}

interface UpgradeCharacterResponse {
  success: boolean;
  character: ChapterCharacter;
  isNew: boolean;
  imageGenerated?: boolean;
  message: string;
}

/**
 * 获取章节角色列表
 */
export function useChapterCharacters(chapterId: string | null) {
  return useQuery<ChapterCharacter[]>({
    queryKey: ["chapterCharacters", chapterId],
    queryFn: async () => {
      if (!chapterId) return [];

      const response = await fetch(`/api/canvas/chapter/${chapterId}/characters`);
      if (!response.ok) {
        throw new Error("获取章节角色失败");
      }

      const data = await response.json();
      // API 返回的是 { data: [...] } 格式
      return data.data || [];
    },
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
}

/**
 * 获取小说角色列表
 */
export function useNovelCharacters(timelineId: string | null) {
  return useQuery<NovelCharacter[]>({
    queryKey: ["novelCharacters", timelineId],
    queryFn: async () => {
      if (!timelineId) return [];

      const response = await fetch(`/api/canvas/timeline/${timelineId}/novel-characters`);
      if (!response.ok) {
        throw new Error("获取小说角色失败");
      }

      const data = await response.json();
      // API 返回的是 { characters: [...] } 格式
      return data.characters || [];
    },
    enabled: !!timelineId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 升级小说角色为完整角色
 */
export function useUpgradeCharacter(chapterId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<UpgradeCharacterResponse, Error, UpgradeCharacterRequest>({
    mutationFn: async (request: UpgradeCharacterRequest) => {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/characters/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "升级角色失败");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // 刷新章节角色列表
      queryClient.invalidateQueries({ queryKey: ["chapterCharacters", chapterId] });

      toast({
        title: "升级成功",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "升级失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * 重新生成角色图片
 */
export function useRegenerateCharacterImage(chapterId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ success: boolean; image_url: string }, Error, string>({
    mutationFn: async (characterId: string) => {
      const response = await fetch(`/api/character/${characterId}/regenerate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "生成图片失败");
      }

      return response.json();
    },
    onSuccess: () => {
      // 刷新章节角色列表
      queryClient.invalidateQueries({ queryKey: ["chapterCharacters", chapterId] });

      toast({
        title: "生成成功",
        description: "角色图片已更新",
      });
    },
    onError: (error) => {
      toast({
        title: "生成失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
