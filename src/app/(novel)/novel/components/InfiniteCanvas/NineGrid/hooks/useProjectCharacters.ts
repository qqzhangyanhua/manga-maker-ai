import { useQuery } from "@tanstack/react-query";
import type { ProjectCharactersResponse } from "../types";

/**
 * 获取项目级别的角色列表
 * 使用正确的 API: /api/novel/projects/{projectId}/characters
 */
export function useProjectCharacters(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-characters", projectId],
    queryFn: async () => {
      if (!projectId) {
        console.warn("[useProjectCharacters] projectId 为空,返回空数据");
        return { characters: [], total_characters: 0 };
      }

      const url = `/api/novel/projects/${projectId}/characters`;
      console.log("[useProjectCharacters] 请求 URL:", url);

      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "未知错误" }));
        console.error("[useProjectCharacters] API 错误:", {
          status: response.status,
          error,
        });
        throw new Error(error.error || `获取角色失败 (${response.status})`);
      }

      const data = await response.json();
      console.log("[useProjectCharacters] API 返回:", {
        characterCount: data.characters?.length || 0,
        characters: data.characters?.map((c: ProjectCharactersResponse["characters"][number]) => ({
          id: c.id,
          name: c.name,
        })),
      });

      return data as ProjectCharactersResponse;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    refetchOnWindowFocus: false,
  });
}
