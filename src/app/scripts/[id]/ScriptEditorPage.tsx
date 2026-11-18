"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { CapsuleNav } from "@/components/common/CapsuleNav";
import type { CapsuleStage } from "@/components/common/CapsuleNav";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { BookOpen, Wand2, Image, Download } from "lucide-react";
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

interface ScriptEditorPageProps {
  storyId: string;
  /** 路由上的项目 ID，用于生成页面链接；数据请求仍按故事加载 */
  routeProjectId: string;
}

export function ScriptEditorPage({ storyId, routeProjectId }: ScriptEditorPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const projectPath = `/projects/${routeProjectId}`;

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

  // 阶段导航：故事构思 → 剧本分镜 → 图像生成 → 排版导出
  const capsuleStages = useMemo((): CapsuleStage[] => {
    const hasStory = !!story;
    const hasChapters = chapters.length > 0;
    const hasPanels = panels.length > 0;
    const hasImages = panels.some((p) => p.generated_image);

    return [
      {
        id: "story",
        label: "故事构思",
        icon: BookOpen,
        status: hasStory ? "completed" : "active",
      },
      {
        id: "script",
        label: "剧本分镜",
        icon: Wand2,
        status: hasPanels ? "completed" : hasChapters ? "active" : hasStory ? "available" : "locked",
      },
      {
        id: "image",
        label: "图像生成",
        icon: Image,
        status: hasImages ? "completed" : hasPanels ? "active" : "locked",
      },
      {
        id: "export",
        label: "排版导出",
        icon: Download,
        status: hasImages ? "available" : "locked",
      },
    ];
  }, [story, chapters.length, panels]);

  const handleStageClick = useCallback(
    (stageId: string) => {
      switch (stageId) {
        case "story":
          uiActions.setActiveTab(TAB_VALUES.SERIAL);
          break;
        case "script":
          uiActions.setActiveTab(TAB_VALUES.SERIAL);
          break;
        case "image":
          uiActions.setActiveTab(TAB_VALUES.STORYBOARD);
          break;
        case "export":
          uiActions.setActiveTab(TAB_VALUES.LAYOUT);
          break;
      }
    },
    [uiActions]
  );

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

  // 批量生成图片：为有 prompt_used 但无 generated_image 的分镜生成图片
  const handleBatchGenerateImages = useCallback(async () => {
    const panelsNeedingImages = panels.filter(
      (p) => p.prompt_used && !p.generated_image
    );

    if (panelsNeedingImages.length === 0) {
      toast({
        title: "没有待生成的分镜",
        description: "所有分镜都已生成图片，或还没有提示词",
      });
      return;
    }

    toast({
      title: "开始批量生成",
      description: `正在为 ${panelsNeedingImages.length} 个分镜生成图片...`,
    });

    try {
      const response = await fetch("/api/panel/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: panelsNeedingImages.map((p) => p.id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "批量生成失败");
      }

      const result = await response.json();
      toast({
        title: "批量生成完成",
        description: `成功: ${result.succeeded}, 失败: ${result.failed}, 跳过: ${result.skipped}`,
        variant: result.failed > 0 ? "destructive" : "default",
      });

      await refetchPanels();
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量生成失败";
      toast({
        title: "批量生成失败",
        description: message,
        variant: "destructive",
      });
    }
  }, [panels, toast, refetchPanels]);

  // Focus mode: 通过路由跳转
  const handleEnterFocusMode = useCallback(
    (panelId?: string) => {
      const url = panelId
        ? `${projectPath}/focus?panel=${panelId}`
        : `${projectPath}/focus`;
      router.push(url);
    },
    [projectPath, router]
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
      router.replace(`${projectPath}?${newSearchParams.toString()}`, { scroll: false });
    }
  }, [uiState.activeTab, searchParams, router, projectPath]);

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
            <h1 className="text-2xl font-bold text-white mb-4">未找到项目</h1>
            <Button onClick={() => router.push("/projects")}>返回我的项目</Button>
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
                <PageBreadcrumb
                  segments={[
                    { label: "我的项目", href: "/projects" },
                    { label: story.title },
                  ]}
                  className="mb-6"
                />
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
                  saveStatus={isSaving ? "saving" : "saved"}
                />

                <CapsuleNav
                  stages={capsuleStages}
                  onStageClick={handleStageClick}
                  className="mb-6"
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
                  onBatchGenerateImages={handleBatchGenerateImages}
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
                  suggestedCharacters={
                    (story.suggested_characters ?? []) as Array<{
                      name: string;
                      role: string;
                      description?: string;
                    }>
                  }
                  storyCharacters={storyCharacters}
                  panels={panels}
                  novelCharacterSync={{
                    dialogOpen: novelCharacterSync.dialogOpen,
                    charactersWithStatus: novelCharacterSync.charactersWithStatus,
                    closeDialog: novelCharacterSync.closeDialog,
                  }}
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
