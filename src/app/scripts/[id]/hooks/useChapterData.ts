/**
 * Chapter data management hooks using React Query
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Chapter, ChapterWithPanels, ChapterFormData } from "../types/script-editor.types";

/**
 * Fetch chapters for a story
 */
export function useChapters(storyId: string) {
  return useQuery({
    queryKey: ["story", storyId, "chapters"],
    queryFn: async (): Promise<Chapter[]> => {
      const res = await fetch(`/api/story/${storyId}/chapters`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "获取章节列表失败");
      }
      const data = await res.json();
      return data.chapters;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Fetch single chapter with panels
 */
export function useChapter(chapterId: string | null) {
  return useQuery({
    queryKey: ["chapter", chapterId],
    queryFn: async (): Promise<ChapterWithPanels> => {
      if (!chapterId) throw new Error("Chapter ID is required");
      const res = await fetch(`/api/chapter/${chapterId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "获取章节详情失败");
      }
      const data = await res.json();
      return data.chapter;
    },
    enabled: !!chapterId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Create a new chapter
 */
export function useCreateChapter(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ChapterFormData): Promise<Chapter> => {
      const res = await fetch(`/api/story/${storyId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "创建章节失败");
      }

      const result = await res.json();
      return result.chapter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story", storyId, "chapters"] });
    },
  });
}

/**
 * Update a chapter
 */
export function useUpdateChapter(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ChapterFormData>): Promise<Chapter> => {
      const res = await fetch(`/api/chapter/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "更新章节失败");
      }

      const result = await res.json();
      return result.chapter;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chapter", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["story", data.story_id, "chapters"] });
    },
  });
}

/**
 * Delete a chapter
 */
export function useDeleteChapter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chapterId, storyId }: { chapterId: string; storyId: string }) => {
      const res = await fetch(`/api/chapter/${chapterId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "删除章节失败");
      }

      return { chapterId, storyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["story", data.storyId, "chapters"] });
      queryClient.invalidateQueries({ queryKey: ["chapter", data.chapterId] });
    },
  });
}

/**
 * AI Generate chapters from story
 */
export function useGenerateChapters(storyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chapterCount, overwrite }: { chapterCount?: number; overwrite?: boolean }): Promise<Chapter[]> => {
      const res = await fetch(`/api/story/${storyId}/generate-chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterCount, overwrite }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "生成章节失败");
      }

      const result = await res.json();
      return result.chapters;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story", storyId, "chapters"] });
    },
  });
}

/**
 * AI Generate panels for a chapter
 */
export function useGeneratePanelsForChapter(chapterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      panelCount,
      overwrite,
    }: {
      projectId: string;
      panelCount?: number;
      overwrite?: boolean;
    }) => {
      const res = await fetch(`/api/chapter/${chapterId}/generate-panels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          panel_count: panelCount,
          overwrite,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "生成分镜失败");
      }

      const result = await res.json();
      return result.panels;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chapter", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["project", variables.projectId, "panels"] });
    },
  });
}
