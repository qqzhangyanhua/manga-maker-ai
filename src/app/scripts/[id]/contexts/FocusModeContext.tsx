"use client";

/**
 * 专注模式上下文 - 重构版
 * Focus Mode Context - 仅管理 UI 状态，业务逻辑已迁移到 Provider 和 Hook
 *
 * 职责：
 * - 面板导航状态（当前面板 ID、上一个/下一个）
 * - 配置状态（提示词、模型参数）
 * - 预览状态（预览图、显示原图）
 *
 * 不包含：
 * - 图片生成逻辑（使用 usePanelImageGeneration Hook）
 * - 面板更新逻辑（使用 ScriptOperationsProvider）
 * - 错误处理（使用 ScriptOperationsProvider）
 */

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { Panel } from "@prisma/client";
import type { Chapter } from "@prisma/client";
import type { Character } from "@prisma/client";
import type {
  FocusModeContextValue,
  FocusModeState,
  FocusModeActions,
  FocusModeConfig,
} from "../components/FocusMode/types";
import { DEFAULT_FOCUS_MODE_CONFIG } from "../components/FocusMode/types";

const FocusModeContext = createContext<FocusModeContextValue | null>(null);

interface FocusModeProviderProps {
  children: React.ReactNode;
  panels: Panel[];
  chapters: Chapter[];
  characters: Character[];
  initialPanelId?: string | null;
  onExit: () => void;
}

export function FocusModeProvider({
  children,
  panels,
  chapters,
  characters,
  initialPanelId,
  onExit,
}: FocusModeProviderProps) {
  // 初始化当前面板
  const initialPanel = useMemo(() => {
    if (initialPanelId) {
      return panels.find((p) => p.id === initialPanelId) || panels[0];
    }
    return panels[0];
  }, [initialPanelId, panels]);

  // UI 状态管理
  const [currentPanelId, setCurrentPanelId] = useState<string | null>(
    initialPanel?.id || null
  );
  const [config, setConfig] = useState<FocusModeConfig>(DEFAULT_FOCUS_MODE_CONFIG);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // 当前面板数据
  const currentPanel = useMemo(() => {
    if (!currentPanelId) return null;
    return panels.find((p) => p.id === currentPanelId) || null;
  }, [currentPanelId, panels]);

  // 导航操作
  const selectPanel = useCallback((panelId: string) => {
    setCurrentPanelId(panelId);

    // 查找新面板，如果有已生成的图片，自动加载到预览
    const newPanel = panels.find((p) => p.id === panelId);
    if (newPanel?.generated_image) {
      setPreviewImageUrl(newPanel.generated_image);
      setShowOriginal(true);
    } else {
      // 没有生成图片时才清空预览
      setPreviewImageUrl(null);
      setShowOriginal(true);
    }
  }, [panels]);

  const goToPreviousPanel = useCallback(() => {
    if (!currentPanelId) return;
    const currentIndex = panels.findIndex((p) => p.id === currentPanelId);
    if (currentIndex > 0) {
      selectPanel(panels[currentIndex - 1].id);
    }
  }, [currentPanelId, panels, selectPanel]);

  const goToNextPanel = useCallback(() => {
    if (!currentPanelId) return;
    const currentIndex = panels.findIndex((p) => p.id === currentPanelId);
    if (currentIndex < panels.length - 1) {
      selectPanel(panels[currentIndex + 1].id);
    }
  }, [currentPanelId, panels, selectPanel]);

  // 配置操作
  const updateConfig = useCallback((newConfig: Partial<FocusModeConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_FOCUS_MODE_CONFIG);
  }, []);

  // 预览操作
  const setPreviewImage = useCallback((imageUrl: string | null) => {
    setPreviewImageUrl(imageUrl);
    if (imageUrl) {
      setShowOriginal(false);
    }
  }, []);

  const toggleShowOriginal = useCallback(() => {
    setShowOriginal((prev) => !prev);
  }, []);

  // 生成状态控制（供 Hook 调用）
  const setGenerationState = useCallback((generating: boolean, progress?: number) => {
    setIsGenerating(generating);
    if (progress !== undefined) {
      setGenerationProgress(progress);
    }
  }, []);

  const exitFocusMode = useCallback(() => {
    onExit();
  }, [onExit]);

  // 组装上下文值
  const state: FocusModeState = useMemo(
    () => ({
      currentPanelId,
      currentPanel: currentPanel as unknown as FocusModeState["currentPanel"],
      config,
      isGenerating,
      generationProgress,
      previewImageUrl,
      showOriginal,
    }),
    [currentPanelId, currentPanel, config, isGenerating, generationProgress, previewImageUrl, showOriginal]
  );

  const actions: FocusModeActions = useMemo(
    () => ({
      selectPanel,
      goToPreviousPanel,
      goToNextPanel,
      updateConfig,
      resetConfig,
      generateImage: async () => {
        // 占位符 - 实际实现在使用 usePanelImageGeneration 的组件中
        console.warn("generateImage should be called from component using usePanelImageGeneration");
      },
      cancelGeneration: () => {
        // 占位符
        console.warn("cancelGeneration should be called from component using usePanelImageGeneration");
      },
      updatePanelDescription: async () => {
        // 占位符 - 实际实现在使用 ScriptOperationsProvider 的组件中
        console.warn("updatePanelDescription should be called from component using ScriptOperationsProvider");
      },
      updatePanelPrompt: async () => {
        // 占位符
        console.warn("updatePanelPrompt should be called from component using ScriptOperationsProvider");
      },
      deletePanelImage: async () => {
        // 占位符
        console.warn("deletePanelImage should be called from component using ScriptOperationsProvider");
      },
      exitFocusMode,
    }),
    [
      selectPanel,
      goToPreviousPanel,
      goToNextPanel,
      updateConfig,
      resetConfig,
      exitFocusMode,
    ]
  );

  const contextValue: FocusModeContextValue = useMemo(
    () => ({
      state,
      actions,
      panels: panels as unknown as FocusModeContextValue["panels"],
      chapters: chapters as unknown as FocusModeContextValue["chapters"],
      characters: characters as unknown as FocusModeContextValue["characters"],
      isLoading: false,
      setPreviewImage,
      toggleShowOriginal,
      setGenerationState,
    }),
    [state, actions, panels, chapters, characters, setPreviewImage, toggleShowOriginal, setGenerationState]
  );

  return (
    <FocusModeContext.Provider value={contextValue}>
      {children}
    </FocusModeContext.Provider>
  );
}

/**
 * 使用专注模式上下文
 */
export function useFocusMode() {
  const context = useContext(FocusModeContext);
  if (!context) {
    throw new Error("useFocusMode must be used within FocusModeProvider");
  }
  return context;
}
