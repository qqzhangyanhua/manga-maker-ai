import { useQuery } from "@tanstack/react-query";
import type { CharacterReference } from "../types/character.types";

interface CharacterListResponse {
  characters: CharacterReference[];
}

/**
 * 获取角色资产列表，供分镜生图时锁脸选择
 */
export function useCharacterAssets(options?: { enabled?: boolean }) {
  return useQuery<CharacterReference[]>({
    queryKey: ["character-assets"],
    queryFn: async () => {
      const response = await fetch("/api/character");
      const data = (await response.json().catch(() => ({ characters: [] }))) as CharacterListResponse & {
        error?: string;
      };

      if (!response.ok) {
        const message = data.error || "获取角色列表失败";
        throw new Error(message);
      }

      return data.characters || [];
    },
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
