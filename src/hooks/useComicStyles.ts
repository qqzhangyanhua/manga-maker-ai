/**
 * useComicStyles Hook
 * 获取漫画风格列表的共享 hook
 * 从 GenerateShotImageDialog 中提取，供多个组件复用
 */

import { useQuery } from "@tanstack/react-query";

export interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  image_url: string | null;
  tag_color: string;
  prompt_prefix: string | null;
}

export interface ComicStylesResponse {
  data: ComicStyle[];
  total: number;
}

export interface UseComicStylesOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * 获取可用的漫画风格列表
 *
 * @param options - 配置选项
 * @param options.enabled - 是否启用查询（默认 true）
 * @param options.staleTime - 缓存时间（默认 5 分钟）
 *
 * @returns React Query 结果，包含 data、isLoading、error 等
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useComicStyles();
 * const styles = data?.data || [];
 * ```
 */
export function useComicStyles(options: UseComicStylesOptions = {}) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  return useQuery<ComicStylesResponse>({
    queryKey: ["canvas-styles"],
    queryFn: async () => {
      const res = await fetch("/api/canvas/styles");
      if (!res.ok) {
        throw new Error("获取风格列表失败");
      }
      return res.json();
    },
    enabled,
    staleTime,
  });
}

/**
 * 根据 ID 查找风格对象
 *
 * @param styles - 风格列表
 * @param styleId - 风格 ID（可以是 null 或 undefined）
 * @returns 找到的风格对象，如果未找到或 styleId 为空则返回 undefined
 *
 * @example
 * ```tsx
 * const { data } = useComicStyles();
 * const selectedStyle = findStyleById(data?.data, config.default_comic_style_id);
 * ```
 */
export function findStyleById(
  styles: ComicStyle[] | undefined,
  styleId: string | null | undefined
): ComicStyle | undefined {
  if (!styles || !styleId) {
    return undefined;
  }
  return styles.find((style) => style.id === styleId);
}

/**
 * 获取风格的显示名称
 *
 * @param style - 风格对象
 * @returns 格式化的显示名称（中文名 + 英文名）
 *
 * @example
 * ```tsx
 * const displayName = getStyleDisplayName(style);
 * // 返回: "日式漫画 (Manga)"
 * ```
 */
export function getStyleDisplayName(style: ComicStyle): string {
  return `${style.name_zh} (${style.name_en})`;
}
