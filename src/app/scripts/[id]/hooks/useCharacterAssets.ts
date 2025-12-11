import { useQuery } from "@tanstack/react-query";
import type { CharacterReference } from "../types/character.types";

interface CharacterListResponse {
  characters: CharacterReference[];
}

/**
 * 获取角色资产列表，供分镜生图时锁脸选择
 */
export function useCharacterAssets() {
  return useQuery<CharacterReference[]>({
    queryKey: ["character-assets"],
    queryFn: async () => {
      const response = await fetch("/api/character");
      const data: CharacterListResponse = await response.json().catch(() => ({ characters: [] } as CharacterListResponse));

      if (!response.ok) {
        const message = (data as any)?.error || "获取角色列表失败";
        throw new Error(message);
      }

      return data.characters || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
