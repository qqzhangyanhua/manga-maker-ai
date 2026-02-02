"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Landing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StoryDetailsSkeleton } from "./components/StoryDetailsSkeleton";
import { NovelSourceCard } from "./components/NovelSourceCard";
import { ScriptPageTopBar } from "./components/ScriptPageTopBar";
import { ScriptPageGuidance } from "./components/ScriptPageGuidance";
import { ScriptPageTabs } from "./components/ScriptPageTabs";
import { NovelCharacterSyncPrompt } from "./components/NovelCharacterSyncPrompt";
import { AssetLibrarySidebarSheet } from "./components/AssetLibrarySidebarSheet";
import { GenerationProgress } from "./components/GenerationProgress";
import { ScriptEditorProvider } from "./contexts/ScriptEditorContext";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { useProgressCalculation } from "@/hooks/useProgressCalculation";
import { useBatchSelection } from "@/hooks/useBatchSelection";
import { useNovelCharacterSync } from "./hooks/useNovelCharacterSync";
import { validateBackgroundParams, ValidationError } from "./utils/inputValidation";
import { formatErrorForToast } from "./utils/errorHandling";
import { useUIState, TAB_VALUES } from "./hooks/useUIState";
import type { TabValue } from "./hooks/useUIState";
import { useScriptPageHandlers } from "./hooks/useScriptPageHandlers";
import { useScriptContextValues } from "./hooks/useScriptContextValues";
import { useAssetApplication } from "./hooks/useAssetApplication";
import { ScriptPageDialogs } from "./components/ScriptPageDialogs";
import { useScriptPageData } from "./hooks/useScriptPageData";
import type { BackgroundGenerationParams, AssetSelectItem } from "./types";
import { useEffect } from "react";

/**
 * 验证 URL 中的 tab 参数是否有效
 */
function isValidTab(tab: string | null): tab is TabValue {
  if (!tab) return false;
  return Object.values(TAB_VALUES).includes(tab as TabValue);
}

export default function ScriptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const storyId = params.id as string;

  // 从 URL 读取初始 tab 值
  const urlTab = searchParams.get("tab");
  const initialTab = isValidTab(urlTab) ? urlTab : TAB_VALUES.SERIAL;

  // ✅ 使用新的数据加载 Hook（替代 200+ 行数据加载代码）
  const {
    story,
    chapters,
    panels,
    sourceNovel,
    projectId,
    characterAssets,
    storyCharacters,
    isLoading,
    isPanelsLoading,
    isCharactersLoading,
    isStoryCharactersLoading,
    error,
    progressInput,
    syncCharacters,
    refreshStoryData,
    refetchCharacters,
    refetchStoryCharacters,
    refetchPanels,
  } = useScriptPageData({ storyId });

  // UI state
  const { state: uiState, actions: uiActions } = useUIState(initialTab);

  // ✅ 使用类型安全的进度计算（无类型断言）
  const progressStats = useProgressCalculation(progressInput);

  // Batch selection for panels
  const panelSelection = useBatchSelection(panels, {
    getId: (panel: { id: string }) => panel.id,
  });

  // Error state management
  const [errorState, setErrorState] = useState<string | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ 对话框状态（集中管理）
  const [importTextDialogOpen, setImportTextDialogOpen] = useState(false);
  const [nineGridDialogOpen, setNineGridDialogOpen] = useState(false);

  // Computed: 下一个章节序号
  const nextChapterOrder = useMemo(() => {
    return chapters.length > 0 ? Math.max(...chapters.map((ch) => ch.chapter_order)) + 1 : 1;
  }, [chapters]);

  // Event handlers
  const {
    isSaving,
    isGenerating,
    progress,
    cancelGeneration,
    handleUpdateStory,
    handleImageGenerated,
    handleDeletePanel,
    handleAddCharacter,
    handleRemoveCharacter,
    handleCharacterRoleChange,
    handleGeneratePanelsForChapter,
    executeGeneration,
  } = useScriptPageHandlers({
    storyId,
    story,
    projectId,
    storyForm: uiState.storyForm,
    setEditMode: uiActions.setEditMode,
    openGenerateDialog: uiActions.openGenerateDialog,
    refetchPanels,
  });

  // 生成章节背景图
  const handleGenerateBackground = useCallback(
    async (chapterId: string, params: BackgroundGenerationParams) => {
      try {
        // ✅ 验证输入参数
        const validatedParams = validateBackgroundParams(params);

        const response = await fetch(`/api/chapter/${chapterId}/generate-background`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validatedParams),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "生成失败");
        }

        toast({
          title: "背景图生成成功",
          description: "章节背景图已生成并保存",
        });

        await refreshStoryData();
      } catch (error) {
        // ✅ 区分验证错误和其他错误
        if (error instanceof ValidationError) {
          toast({
            title: "参数验证失败",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        const message = error instanceof Error ? error.message : "生成背景图失败";
        setErrorState(message);
        console.error("生成背景图失败:", error);
        throw error;
      }
    },
    [refreshStoryData, toast]
  );

  // ✅ 九宫格生成成功回调（引用稳定）
  const handleNineGridSuccess = useCallback(() => {
    setNineGridDialogOpen(false);
    void refreshStoryData();
    toast({
      title: "生成成功",
      description: "已成功生成九宫格分镜",
    });
  }, [refreshStoryData, toast]);

  // ✅ 导入文本成功回调
  const handleImportSuccess = useCallback(() => {
    setImportTextDialogOpen(false);
    void refreshStoryData();
    toast({
      title: "导入成功",
      description: "已成功生成分镜，刷新页面查看",
    });
  }, [refreshStoryData, toast]);

  // ✅ Novel character sync（使用类型安全的数据）
  const novelCharacterSync = useNovelCharacterSync({
    storyId,
    sourceNovelId: story?.source_novel_id || null,
    suggestedCharacters: story?.suggested_characters || [],
    storyCharacters: syncCharacters,
  });

  // Asset application hook
  const { applyCharacterToPanels, applySceneToPanels } = useAssetApplication({
    selectedPanelIds: Array.from(panelSelection.selected),
    onRefresh: async () => {
      await refetchPanels();
    },
  });

  // Focus mode: 通过路由跳转
  const handleEnterFocusMode = useCallback(
    (panelId?: string) => {
      const url = panelId
        ? `/scripts/${storyId}/focus?panel=${panelId}`
        : `/scripts/${storyId}/focus`;
      router.push(url);
    },
    [storyId, router]
  );

  // Asset library handlers
  const handleAssetCharacterSelect = useCallback(
    async (character: AssetSelectItem) => {
      const success = await applyCharacterToPanels(character);
      if (success) {
        setSidebarOpen(false);
      }
    },
    [applyCharacterToPanels]
  );

  const handleSceneSelect = useCallback(
    async (scene: AssetSelectItem) => {
      const success = await applySceneToPanels(scene);
      if (success) {
        setSidebarOpen(false);
      }
    },
    [applySceneToPanels]
  );

  // 同步 activeTab 到 URL（无刷新）
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab !== uiState.activeTab) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set("tab", uiState.activeTab);
      router.replace(`/scripts/${storyId}?${newSearchParams.toString()}`, { scroll: false });
    }
  }, [uiState.activeTab, searchParams, router, storyId]);

  // Sync form with fetched data
  useEffect(() => {
    if (!story || uiState.editMode) return;

    uiActions.setStoryForm({
      title: story.title,
      premise: story.premise || "",
      comic_style_id: story.comic_style_id || null,
      style_reference_image: story.style_reference_image || null,
    });
  }, [story, uiActions, uiState.editMode]);

  // Error handling
  useEffect(() => {
    if (error) {
      const errorInfo = formatErrorForToast(error);
      setErrorState(`${errorInfo.title}: ${errorInfo.description}`);
    }
  }, [error]);

  // Context values
  const { dataContextValue, uiContextValue, operationsContextValue } = useScriptContextValues({
    storyId,
    projectId,
    story,
    panels,
    chapters,
    characterAssets,
    storyCharacters,
    isLoading,
    isPanelsLoading,
    isCharactersLoading,
    isStoryCharactersLoading,
    refreshStoryData,
    refetchCharacters: () => refetchCharacters(),
    refetchStoryCharacters: () => refetchStoryCharacters(),
    uiState,
    uiActions,
    isSaving,
    isGenerating,
    nextChapterOrder,
    handleUpdateStory,
    handleAddCharacter,
    handleRemoveCharacter,
    handleCharacterRoleChange,
    handleDeletePanel,
    handleImageGenerated,
    handleGeneratePanelsForChapter,
    executeGeneration,
  });

  // Early returns
  if (isLoading) {
    return <StoryDetailsSkeleton />;
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-[#0f0f13]">
        <Navbar />
        <main className="pt-16">
          <div className="container py-12 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">未找到剧本</h1>
            <Button onClick={() => router.push("/scripts")}>返回列表</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ScriptEditorProvider
        dataValue={dataContextValue}
        uiValue={uiContextValue}
        operationsValue={operationsContextValue}
      >
        <div className="min-h-screen bg-[#0f0f13]">
          <Navbar />

          <main className="pt-16">
            {/* Decorative glows */}
            <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
            <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/3 blur-3xl rounded-full pointer-events-none" />

            <div className="relative px-4 py-8">
              <div className="max-w-6xl mx-auto relative">
                {/* Error Banner */}
                {errorState && (
                  <div className="mb-6">
                    <ErrorBanner
                      message={errorState}
                      dismissible={true}
                      onDismiss={() => setErrorState(null)}
                      action={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setErrorState(null);
                            void refreshStoryData();
                          }}
                        >
                          重试
                        </Button>
                      }
                    />
                  </div>
                )}

                {/* 顶部标题区域 */}
                <ScriptPageTopBar
                  title={story.title}
                  chapters={chapters}
                  panels={panels}
                  nextChapterOrder={nextChapterOrder}
                  onCreateChapter={() => {
                    uiActions.openChapterDialog("create", nextChapterOrder);
                  }}
                  onImportText={() => setImportTextDialogOpen(true)}
                  onEnterFocusMode={() => handleEnterFocusMode()}
                  onOpenSidebar={() => setSidebarOpen(true)}
                  onOpenNineGrid={() => setNineGridDialogOpen(true)}
                />

                {/* 小说来源信息卡片 */}
                <NovelSourceCard
                  sourceNovel={sourceNovel}
                  sourceNovelId={story.source_novel_id || null}
                  storyId={storyId}
                />

                {/* 小说角色同步提示 */}
                <NovelCharacterSyncPrompt
                  shouldShow={novelCharacterSync.shouldShowSyncPrompt}
                  novelTitle={sourceNovel?.title || ""}
                  unmatchedCount={
                    novelCharacterSync.charactersWithStatus.filter((c) => !c.generated).length
                  }
                  onSyncClick={novelCharacterSync.openDialog}
                />

                {/* 空状态引导和智能提示 */}
                <ScriptPageGuidance
                  progressStats={progressStats}
                  chapters={chapters}
                  onGeneratePanelsForChapter={handleGeneratePanelsForChapter}
                  onSetCurrentChapter={uiActions.setCurrentChapter}
                />

                {/* Tab 导航 */}
                <ScriptPageTabs
                  activeTab={uiState.activeTab}
                  storyId={storyId}
                  projectId={projectId}
                  sourceNovelId={story.source_novel_id || null}
                  storyTitle={story.title}
                  storyStyle={story.style}
                  chapters={chapters}
                  panels={panels}
                  storyCharacters={storyCharacters}
                  characterAssets={characterAssets}
                  isCharactersLoading={isCharactersLoading}
                  isStoryCharactersLoading={isStoryCharactersLoading}
                  isGenerating={isGenerating}
                  streamingPanels={progress.generatedPanels || []}
                  progressStats={progressStats}
                  nextChapterOrder={nextChapterOrder}
                  onTabChange={(value) =>
                    uiActions.setActiveTab(value as typeof uiState.activeTab)
                  }
                  onGenerateNext={() => {
                    uiActions.openChapterDialog("generate-next", nextChapterOrder);
                  }}
                  onGeneratePanels={(chapterId) => {
                    uiActions.setCurrentChapter(chapterId);
                    handleGeneratePanelsForChapter(chapterId);
                  }}
                  onGenerateBackground={handleGenerateBackground}
                  onDeletePanel={handleDeletePanel}
                  onImageGenerated={handleImageGenerated}
                  onCharactersRefresh={async () => {
                    await refetchCharacters();
                  }}
                  onStoryCharactersRefresh={async () => {
                    await refetchStoryCharacters();
                  }}
                  onRefreshStoryData={refreshStoryData}
                  onRefetchPanels={async () => {
                    await refetchPanels();
                  }}
                  onError={(msg) =>
                    toast({ title: "错误", description: msg, variant: "destructive" })
                  }
                />

                <GenerationProgress progress={progress} onCancel={cancelGeneration} />

                {/* ✅ 使用新的对话框集合组件（替代 80+ 行代码） */}
                <ScriptPageDialogs
                  storyId={storyId}
                  projectId={projectId}
                  chapters={chapters}
                  uiState={uiState}
                  uiActions={uiActions}
                  importTextDialogOpen={importTextDialogOpen}
                  setImportTextDialogOpen={setImportTextDialogOpen}
                  nineGridDialogOpen={nineGridDialogOpen}
                  setNineGridDialogOpen={setNineGridDialogOpen}
                  nextChapterOrder={nextChapterOrder}
                  suggestedCharacters={story.suggested_characters || []}
                  storyCharacters={syncCharacters}
                  panels={panels}
                  novelCharacterSync={novelCharacterSync}
                  onRefresh={refreshStoryData}
                  onRefetchStoryCharacters={async () => {
                    await refetchStoryCharacters();
                  }}
                  onExecuteGeneration={executeGeneration}
                  onNineGridSuccess={handleNineGridSuccess}
                  onImportSuccess={handleImportSuccess}
                />

                {/* 资源库侧边栏 */}
                {FEATURE_FLAGS.NEW_ASSET_SIDEBAR && (
                  <AssetLibrarySidebarSheet
                    open={sidebarOpen}
                    storyId={storyId}
                    projectId={projectId}
                    characterAssets={characterAssets}
                    isCharactersLoading={isCharactersLoading}
                    onOpenChange={setSidebarOpen}
                    onCharacterSelect={handleAssetCharacterSelect}
                    onSceneSelect={handleSceneSelect}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </ScriptEditorProvider>
    </ErrorBoundary>
  );
}
