"use client";

import { createContext, useContext, useCallback, ReactNode } from "react";
import { useStoryDataOptimized } from "../hooks/useStoryDataOptimized";
import { useCharacterAssets } from "../hooks/useCharacterAssets";
import { useStoryCharacters } from "../hooks/useStoryCharacters";
import { ScriptDataContextValue } from "../types/providers.types";

const ScriptDataContext = createContext<ScriptDataContextValue | null>(null);

interface ScriptDataProviderProps {
  storyId: string;
  children: ReactNode;
}

/**
 * 数据层 Provider
 *
 * 职责：
 * 1. 统一管理所有数据获取逻辑
 * 2. 提供数据刷新方法
 * 3. 管理加载状态
 *
 * 设计原则：
 * - 只负责数据获取，不包含业务逻辑
 * - 所有数据通过 Context 传递，避免 props drilling
 * - 使用 useCallback 优化刷新方法
 */
export function ScriptDataProvider({ storyId, children }: ScriptDataProviderProps) {
  // 核心数据获取
  const {
    data,
    isLoading,
    isPanelsLoading,
    refetchPanels,
    refetchStory,
    hasStory,
  } = useStoryDataOptimized(storyId);

  // 次要数据获取（等核心数据加载完成后再加载）
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

  // 统一刷新方法
  const refetchAll = useCallback(async (): Promise<void> => {
    const results = await Promise.allSettled([
      refetchStory(),
      refetchPanels(),
      refetchCharacters(),
      refetchStoryCharacters(),
    ]);

    // 检查失败的请求
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error("部分数据刷新失败:", failed);
      // 不抛出错误，允许部分成功
    }
  }, [refetchStory, refetchPanels, refetchCharacters, refetchStoryCharacters]);

  // Context 值
  const value: ScriptDataContextValue = {
    // 核心数据
    storyId,
    projectId: data?.projectId || null,
    story: data?.story as any || null,
    chapters: data?.chapters as any || [],
    panels: data?.panels as any || [],

    // 角色数据
    characterAssets: characterAssets as any || [],
    storyCharacters: storyCharacters || [],

    // 加载状态
    isLoading,
    isPanelsLoading,
    isCharactersLoading,
    isStoryCharactersLoading,
    hasStory,

    // 刷新方法
    refetchStory: async () => {
      await refetchStory();
    },
    refetchPanels: async () => {
      await refetchPanels();
    },
    refetchCharacters: async () => {
      await refetchCharacters();
    },
    refetchStoryCharacters: async () => {
      await refetchStoryCharacters();
    },
    refetchAll,
  };

  return <ScriptDataContext.Provider value={value}>{children}</ScriptDataContext.Provider>;
}

/**
 * 使用数据层 Context 的 Hook
 */
export function useScriptData(): ScriptDataContextValue {
  const context = useContext(ScriptDataContext);
  if (!context) {
    throw new Error("useScriptData must be used within ScriptDataProvider");
  }
  return context;
}
