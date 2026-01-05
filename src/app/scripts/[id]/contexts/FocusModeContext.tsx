"use client";

/**
 * 专注模式上下文
 * Focus Mode Context - 管理专注编辑模式的状态
 */

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { Panel, Chapter, CharacterAsset } from "@/types";
import type {
  FocusModeContextValue,
  FocusModeState,
  FocusModeActions,
  FocusModePanel,
  FocusModeConfig,
} from "../components/FocusMode/types";
import { DEFAULT_FOCUS_MODE_CONFIG } from "../components/FocusMode/types";
import { useToast } from "@/hooks/use-toast";

const FocusModeContext = createContext<FocusModeContextValue | null>(null);

interface FocusModeProviderProps {
  children: React.ReactNode;
  storyId: string;
  projectId: string | null;
  panels: Panel[];
  chapters: Chapter[];
  characters: CharacterAsset[];
  initialPanelId?: string | null;
  onExit: () => void;
  onPanelUpdate: () => void;
}

export function FocusModeProvider({
  children,
  storyId,
  projectId,
  panels,
  chapters,
  characters,
  initialPanelId,
  onExit,
  onPanelUpdate,
}: FocusModeProviderProps) {
  const { toast } = useToast();
  
  // 初始化当前面板
  const initialPanel = useMemo(() => {
    if (initialPanelId) {
      return panels.find((p) => p.id === initialPanelId) || panels[0];
    }
    return panels[0];
  }, [initialPanelId, panels]);

  // 状态管理
  const [currentPanelId, setCurrentPanelId] = useState<string | null>(
    initialPanel?.id || null
  );
  const [config, setConfig] = useState<FocusModeConfig>(DEFAULT_FOCUS_MODE_CONFIG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);

  // 当前面板数据
  const currentPanel = useMemo(() => {
    if (!currentPanelId) return null;
    return panels.find((p) => p.id === currentPanelId) || null;
  }, [currentPanelId, panels]);

  // 导航操作
  const selectPanel = useCallback((panelId: string) => {
    setCurrentPanelId(panelId);
    // 重置预览状态
    setShowOriginal(true);
    setPreviewImageUrl(null);
  }, []);

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

  // 生成操作
  const generateImage = useCallback(async () => {
    if (!currentPanel) {
      toast({
        title: "错误",
        description: "未选择分镜",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const requestBody: Record<string, unknown> = {
        panel_id: currentPanel.id,
        prompt: config.customPrompt || currentPanel.prompt_used,
        negative_prompt: config.negativePrompt,
        model_name: config.modelName,
        aspect_ratio: config.aspectRatio,
        num_inference_steps: config.numInferenceSteps,
        guidance_scale: config.guidanceScale,
      };

      // 添加参考图（如果有）
      if (config.referenceImages.length > 0) {
        requestBody.reference_image_urls = config.referenceImages.map((img) => img.url);
      }

      const response = await fetch(`/api/panel/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "生成失败");
      }

      const result = await response.json();
      
      // 更新预览图
      setPreviewImageUrl(result.image_url);
      setShowOriginal(false);

      toast({
        title: "生成成功",
        description: "分镜图片已生成",
      });

      // 通知父组件更新数据
      onPanelUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      toast({
        title: "生成失败",
        description: message,
        variant: "destructive",
      });
      console.error("图片生成失败:", error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [currentPanel, config, toast, onPanelUpdate]);

  const cancelGeneration = useCallback(() => {
    setIsGenerating(false);
    setGenerationProgress(0);
  }, []);

  // 编辑操作
  const updatePanelDescription = useCallback(
    async (description: string) => {
      if (!currentPanel) return;

      try {
        const response = await fetch(`/api/panel/${currentPanel.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        });

        if (!response.ok) {
          throw new Error("更新失败");
        }

        toast({
          title: "更新成功",
          description: "分镜描述已更新",
        });

        onPanelUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : "更新失败";
        toast({
          title: "更新失败",
          description: message,
          variant: "destructive",
        });
      }
    },
    [currentPanel, toast, onPanelUpdate]
  );

  const updatePanelPrompt = useCallback(
    async (prompt: string) => {
      if (!currentPanel) return;

      try {
        const response = await fetch(`/api/panel/${currentPanel.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt_used: prompt }),
        });

        if (!response.ok) {
          throw new Error("更新失败");
        }

        toast({
          title: "更新成功",
          description: "提示词已更新",
        });

        onPanelUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : "更新失败";
        toast({
          title: "更新失败",
          description: message,
          variant: "destructive",
        });
      }
    },
    [currentPanel, toast, onPanelUpdate]
  );

  const deletePanelImage = useCallback(async () => {
    if (!currentPanel) return;

    try {
      const response = await fetch(`/api/panel/${currentPanel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: null,
          image_generation_status: null,
        }),
      });

      if (!response.ok) {
        throw new Error("删除失败");
      }

      setPreviewImageUrl(null);
      setShowOriginal(true);

      toast({
        title: "删除成功",
        description: "分镜图片已删除",
      });

      onPanelUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败";
      toast({
        title: "删除失败",
        description: message,
        variant: "destructive",
      });
    }
  }, [currentPanel, toast, onPanelUpdate]);

  const exitFocusMode = useCallback(() => {
    onExit();
  }, [onExit]);

  // 组装上下文值
  const state: FocusModeState = useMemo(
    () => ({
      currentPanelId,
      currentPanel: currentPanel as FocusModePanel | null,
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
      generateImage,
      cancelGeneration,
      updatePanelDescription,
      updatePanelPrompt,
      deletePanelImage,
      exitFocusMode,
    }),
    [
      selectPanel,
      goToPreviousPanel,
      goToNextPanel,
      updateConfig,
      resetConfig,
      generateImage,
      cancelGeneration,
      updatePanelDescription,
      updatePanelPrompt,
      deletePanelImage,
      exitFocusMode,
    ]
  );

  const contextValue: FocusModeContextValue = useMemo(
    () => ({
      state,
      actions,
      panels,
      chapters,
      characters,
      isLoading: false,
    }),
    [state, actions, panels, chapters, characters]
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

