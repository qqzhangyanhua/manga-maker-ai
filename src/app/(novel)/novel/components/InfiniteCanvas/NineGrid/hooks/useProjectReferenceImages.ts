import { useQuery } from "@tanstack/react-query";
import type { ProjectReferenceImagesResponse, ReferenceImageSource } from "../types";

interface UseProjectReferenceImagesOptions {
  projectId: string | undefined;
  types?: ReferenceImageSource[];
  characterId?: string;
}

export function useProjectReferenceImages({
  projectId,
  types = ["shot_image", "scene", "final"],
  characterId,
}: UseProjectReferenceImagesOptions) {
  return useQuery({
    queryKey: ["project-reference-images", projectId, types, characterId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error("项目ID不能为空");
      }

      const params = new URLSearchParams();
      
      // 转换类型格式: shot_image -> shot
      const apiTypes = types.map((type) => {
        if (type === "shot_image") return "shot";
        return type;
      });
      params.append("types", apiTypes.join(","));

      if (characterId) {
        params.append("characterId", characterId);
      }

      const response = await fetch(
        `/api/canvas/project/${projectId}/reference-images?${params}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "获取参考图失败");
      }

      return response.json() as Promise<ProjectReferenceImagesResponse>;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5分钟缓存
    refetchOnWindowFocus: false,
  });
}
