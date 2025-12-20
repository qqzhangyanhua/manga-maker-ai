/**
 * useComicStyles - 获取漫画风格列表
 */

import { useQuery } from "@tanstack/react-query";
import type { ComicStyle } from "../types/script-editor.types";

interface ComicStylesResponse {
  data: ComicStyle[];
  total: number;
}

export function useComicStyles() {
  return useQuery<ComicStyle[]>({
    queryKey: ["comic-styles"],
    queryFn: async () => {
      const response = await fetch("/api/comic-styles");
      if (!response.ok) {
        throw new Error("获取风格列表失败");
      }
      const data: ComicStylesResponse = await response.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
  });
}
