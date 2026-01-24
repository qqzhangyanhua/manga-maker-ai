import { useQuery } from "@tanstack/react-query";
import type { ChapterCharactersResponse } from "../types";

export function useChapterCharacters(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["chapter-characters", chapterId],
    queryFn: async () => {
      if (!chapterId) {
        throw new Error("章节ID不能为空");
      }

      const response = await fetch(`/api/canvas/chapter/${chapterId}/characters`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "获取角色失败");
      }

      return response.json() as Promise<ChapterCharactersResponse>;
    },
    enabled: !!chapterId,
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    refetchOnWindowFocus: false,
  });
}
