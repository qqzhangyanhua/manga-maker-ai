import { useQuery } from "@tanstack/react-query";
import type { ChapterCharactersResponse } from "../types";

export function useChapterCharacters(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["chapter-characters", chapterId],
    queryFn: async () => {
      // 🔍 调试日志 - 追踪 API 调用
      console.log("[useChapterCharacters] 开始查询:", { chapterId });

      if (!chapterId) {
        console.warn("[useChapterCharacters] chapterId 为空,返回空数据");
        // 返回空数据而不是抛出错误,避免查询失败
        return { characters: [] };
      }

      const url = `/api/novel/chapter/${chapterId}/characters`;
      console.log("[useChapterCharacters] 请求 URL:", url);

      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "未知错误" }));
        console.error("[useChapterCharacters] API 错误:", {
          status: response.status,
          error,
        });
        throw new Error(error.error || `获取角色失败 (${response.status})`);
      }

      const data = await response.json();
      console.log("[useChapterCharacters] API 返回:", {
        characterCount: data.characters?.length || 0,
        characters: data.characters?.map((c: any) => ({
          id: c.id,
          name: c.name,
          hasAvatar: !!c.avatar_url,
        })),
      });

      return data as ChapterCharactersResponse;
    },
    enabled: true, // 始终启用查询,在 queryFn 内部处理空 chapterId
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    refetchOnWindowFocus: false,
  });
}
