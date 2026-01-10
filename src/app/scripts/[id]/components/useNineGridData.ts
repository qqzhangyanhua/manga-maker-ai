/**
 * 九宫格数据获取 Hook
 * 负责加载章节分镜、漫画风格、角色素材
 */

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Panel, ComicStyle, CharacterAsset } from "./NineGridDialog.types";
import { ERROR_MESSAGES } from "./NineGridDialog.constants";

interface UseNineGridDataReturn {
  // 章节分镜
  chapterPanels: Panel[];
  isLoadingPanels: boolean;
  loadChapterPanels: (chapterId: string) => Promise<void>;
  
  // 漫画风格
  comicStyles: ComicStyle[];
  isLoadingStyles: boolean;
  loadComicStyles: () => Promise<void>;
  
  // 角色素材
  characterAssets: CharacterAsset[];
  isLoadingAssets: boolean;
  loadCharacterAssets: () => Promise<void>;
}

/**
 * 通用的数据获取函数
 */
async function fetchData<T>(
  url: string,
  dataKey: string,
  onError?: (error: unknown) => void
): Promise<T[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return (data[dataKey] || []) as T[];
  } catch (error) {
    onError?.(error);
    return [];
  }
}

export function useNineGridData(): UseNineGridDataReturn {
  const { toast } = useToast();
  
  // 章节分镜
  const [chapterPanels, setChapterPanels] = useState<Panel[]>([]);
  const [isLoadingPanels, setIsLoadingPanels] = useState(false);
  
  // 漫画风格
  const [comicStyles, setComicStyles] = useState<ComicStyle[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(false);
  
  // 角色素材
  const [characterAssets, setCharacterAssets] = useState<CharacterAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  const loadChapterPanels = useCallback(async (chapterId: string) => {
    setIsLoadingPanels(true);
    try {
      const panels = await fetchData<Panel>(
        `/api/chapter/${chapterId}/panels`,
        "panels",
        (error) => {
          console.error("加载章节分镜失败:", error);
          toast({
            title: "加载失败",
            description: ERROR_MESSAGES.LOAD_PANELS_FAILED,
            variant: "destructive",
          });
        }
      );
      setChapterPanels(panels);
    } finally {
      setIsLoadingPanels(false);
    }
  }, [toast]);

  const loadComicStyles = useCallback(async () => {
    setIsLoadingStyles(true);
    try {
      const styles = await fetchData<ComicStyle>(
        "/api/comic-styles?enabled=true",
        "data",
        (error) => console.error("加载漫画风格失败:", error)
      );
      setComicStyles(styles);
    } finally {
      setIsLoadingStyles(false);
    }
  }, []);

  const loadCharacterAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    try {
      const assets = await fetchData<CharacterAsset>(
        "/api/character",
        "characters",
        (error) => console.error("加载角色素材失败:", error)
      );
      // 只保留有图片的素材
      const assetsWithImage = assets.filter((asset) => asset.base_image_url);
      setCharacterAssets(assetsWithImage);
    } finally {
      setIsLoadingAssets(false);
    }
  }, []);

  return {
    chapterPanels,
    isLoadingPanels,
    loadChapterPanels,
    comicStyles,
    isLoadingStyles,
    loadComicStyles,
    characterAssets,
    isLoadingAssets,
    loadCharacterAssets,
  };
}
