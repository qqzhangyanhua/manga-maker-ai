/**
 * 数据加载逻辑集中管理
 * 统一管理故事、章节、分镜、角色等数据的查询和刷新
 */

import { useCallback, useRef, useEffect } from "react";
import { useStoryDataOptimized } from "./useStoryDataOptimized";
import { useCharacterAssets } from "./useCharacterAssets";
import { useStoryCharacters } from "./useStoryCharacters";
import type { ProgressCalculationInput, StoryCharacterForSync } from "../types";

export interface UseScriptPageDataOptions {
  storyId: string;
}

export interface ScriptPageDataResult {
  // 核心数据
  story: NonNullable<ReturnType<typeof useStoryDataOptimized>["data"]>["story"] | null;
  chapters: NonNullable<ReturnType<typeof useStoryDataOptimized>["data"]>["chapters"];
  panels: NonNullable<ReturnType<typeof useStoryDataOptimized>["data"]>["panels"];
  sourceNovel: NonNullable<ReturnType<typeof useStoryDataOptimized>["data"]>["sourceNovel"];
  projectId: string | null;

  // 次级数据
  characterAssets: ReturnType<typeof useCharacterAssets>["data"];
  storyCharacters: ReturnType<typeof useStoryCharacters>["data"];

  // 加载状态
  isLoading: boolean;
  isPanelsLoading: boolean;
  isCharactersLoading: boolean;
  isStoryCharactersLoading: boolean;
  error: Error | null;

  // 类型转换后的数据（用于子组件）
  progressInput: ProgressCalculationInput;
  syncCharacters: StoryCharacterForSync[];

  // 刷新函数
  refreshStoryData: () => Promise<void>;
  refetchCharacters: () => Promise<unknown>;
  refetchStoryCharacters: () => Promise<unknown>;
  refetchPanels: () => Promise<unknown>;
}

/**
 * 统一的数据加载 Hook
 *
 * @example
 * const {
 *   story,
 *   chapters,
 *   panels,
 *   refreshStoryData,
 *   progressInput,
 * } = useScriptPageData({ storyId });
 */
export function useScriptPageData({
  storyId,
}: UseScriptPageDataOptions): ScriptPageDataResult {
  // 核心数据加载
  const {
    data,
    isLoading,
    isPanelsLoading,
    error,
    refetchPanels,
    refetchStory,
    hasStory,
  } = useStoryDataOptimized(storyId);

  // 次级数据延迟加载（等核心数据加载完成）
  const enabled = hasStory && !isLoading;

  const {
    data: characterAssets = [],
    isLoading: isCharactersLoading,
    refetch: refetchCharacters,
  } = useCharacterAssets({ enabled });

  const {
    data: storyCharacters = [],
    isLoading: isStoryCharactersLoading,
    refetch: refetchStoryCharacters,
  } = useStoryCharacters(storyId, { enabled });

  // ✅ 使用 useRef 存储 refetch 函数，避免依赖变化导致无限循环
  const refetchFunctionsRef = useRef({ refetchStory, refetchPanels });
  useEffect(() => {
    refetchFunctionsRef.current = { refetchStory, refetchPanels };
  }, [refetchStory, refetchPanels]);

  // ✅ 稳定的刷新函数（空依赖数组，引用永不变化）
  const refreshStoryData = useCallback(async () => {
    await Promise.all([
      refetchFunctionsRef.current.refetchStory(),
      refetchFunctionsRef.current.refetchPanels(),
    ]);
  }, []);

  // ✅ 类型转换：进度计算输入（消除 as unknown as）
  const progressInput: ProgressCalculationInput = {
    chapters: data?.chapters || [],
    panels: data?.panels || [],
  };

  // ✅ 类型转换：小说角色同步（消除运行时 'name' in 检查）
  const syncCharacters: StoryCharacterForSync[] = storyCharacters.map((sc) => ({
    character: {
      name: typeof sc.character === "object" && sc.character !== null && "name" in sc.character
        ? String(sc.character.name)
        : "",
    },
  }));

  return {
    // 核心数据
    story: data?.story || null,
    chapters: data?.chapters || [],
    panels: data?.panels || [],
    sourceNovel: data?.sourceNovel || null,
    projectId: data?.projectId || null,

    // 次级数据
    characterAssets,
    storyCharacters,

    // 加载状态
    isLoading,
    isPanelsLoading,
    isCharactersLoading,
    isStoryCharactersLoading,
    error,

    // 类型安全的数据
    progressInput,
    syncCharacters,

    // 刷新函数
    refreshStoryData,
    refetchCharacters,
    refetchStoryCharacters,
    refetchPanels,
  };
}
