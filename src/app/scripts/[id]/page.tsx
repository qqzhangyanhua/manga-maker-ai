"use client";

import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Landing";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StoryDetailsSkeleton } from "./components/StoryDetailsSkeleton";
import { NovelSourceCard } from "./components/NovelSourceCard";
import { DialogsManager } from "./components/DialogsManager";
import { ScriptPageTopBar } from "./components/ScriptPageTopBar";
import { ScriptPageGuidance } from "./components/ScriptPageGuidance";
import { ScriptPageTabs } from "./components/ScriptPageTabs";
import { NovelCharacterSyncPrompt } from "./components/NovelCharacterSyncPrompt";
import { AssetLibrarySidebarSheet } from "./components/AssetLibrarySidebarSheet";
import { useStoryDataOptimized } from "./hooks/useStoryDataOptimized";
import { useCharacterAssets } from "./hooks/useCharacterAssets";
import { useStoryCharacters } from "./hooks/useStoryCharacters";
import { useUIState } from "./hooks/useUIState";
import { useScriptPageHandlers } from "./hooks/useScriptPageHandlers";
import { useScriptContextValues } from "./hooks/useScriptContextValues";
import { useAssetApplication } from "./hooks/useAssetApplication";
import { formatErrorForToast } from "./utils/errorHandling";
import { GenerationProgress } from "./components/GenerationProgress";
import { ImportTextDialog } from "@/components/StoryScript/ImportTextDialog";
import { ScriptEditorProvider } from "./contexts/ScriptEditorContext";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { useProgressCalculation } from "@/hooks/useProgressCalculation";
import { useBatchSelection } from "@/hooks/useBatchSelection";
import { useNovelCharacterSync } from "./hooks/useNovelCharacterSync";
import { NineGridDialog } from "./components/NineGridDialog";
import { validateBackgroundParams, ValidationError } from "./utils/inputValidation";

export default function ScriptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const storyId = params.id as string;

  // Data fetching hooks
  const { data, isLoading, isPanelsLoading, error, refetchPanels, refetchStory, hasStory } =
    useStoryDataOptimized(storyId);

  // 等核心数据加载完成后再加载次要数据
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

  const refreshStoryData = useCallback(async () => {
    await Promise.all([
      refetchFunctionsRef.current.refetchStory(),
      refetchFunctionsRef.current.refetchPanels(),
    ]);
  }, []); // ✅ 空依赖数组，函数引用永不变化

  // UI state
  const { state: uiState, actions: uiActions } = useUIState();

  // Progress calculation - 使用 as unknown 解决类型系统冲突
  const progressStats = useProgressCalculation({
    chapters: (data?.chapters || []) as unknown as Parameters<typeof useProgressCalculation>[0]['chapters'],
    panels: (data?.panels || []) as unknown as Parameters<typeof useProgressCalculation>[0]['panels'],
  });

  // Batch selection for panels
  const panelSelection = useBatchSelection(
    data?.panels || [],
    { getId: (panel: { id: string }) => panel.id }
  );

  // Error state management
  const [errorState, setErrorState] = useState<string | null>(null);

  // Sidebar state (for new layout)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Import text dialog state
  const [importTextDialogOpen, setImportTextDialogOpen] = useState(false);

  // Nine grid dialog state
  const [nineGridDialogOpen, setNineGridDialogOpen] = useState(false);

  // ✅ 使用 useMemo 确保引用稳定,避免子组件不必要的重渲染
  const chapters = useMemo(() => data?.chapters || [], [data?.chapters]);
  const projectId = data?.projectId || null;

  // ✅ 稳定的 onSuccess 回调（refreshStoryData 现在是稳定的）
  const handleNineGridSuccess = useCallback(() => {
    setNineGridDialogOpen(false);
    void refreshStoryData();
    toast({
      title: "生成成功",
      description: "已成功生成九宫格分镜",
    });
  }, [refreshStoryData, toast]); // refreshStoryData 现在引用稳定

  // Novel character sync - 修复类型错误
  const novelCharacterSync = useNovelCharacterSync({
    storyId,
    sourceNovelId: data?.story?.source_novel_id || null,
    suggestedCharacters: data?.story?.suggested_characters || [],
    storyCharacters: storyCharacters.map(sc => ({
      character: {
        name: 'name' in sc.character ? (sc.character.name as string) : '',
      },
    })),
  });

  // Asset application hook
  const { applyCharacterToPanels, applySceneToPanels } = useAssetApplication({
    selectedPanelIds: Array.from(panelSelection.selected),
    onRefresh: async () => {
      await refetchPanels();
    },
  });

  // Focus mode: 通过路由跳转而不是状态切换
  const handleEnterFocusMode = useCallback(
    (panelId?: string) => {
      const url = panelId
        ? `/scripts/${storyId}/focus?panel=${panelId}`
        : `/scripts/${storyId}/focus`;
      router.push(url);
    },
    [storyId, router]
  );

  // Computed: 下一个章节序号 (保留 useMemo,因为有计算逻辑)
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
    story: data?.story || null,
    projectId: data?.projectId || null,
    storyForm: uiState.storyForm,
    setEditMode: uiActions.setEditMode,
    openGenerateDialog: uiActions.openGenerateDialog,
    refetchPanels,
  });

  // 生成章节背景图 - 添加输入验证
  const handleGenerateBackground = useCallback(async (
    chapterId: string,
    params: { scene_type: string; style: string; prompt?: string; negative_prompt?: string }
  ) => {
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

      // 刷新故事数据以显示新的背景图
      await refreshStoryData();
    } catch (error) {
      // ✅ 区分验证错误和其他错误
      if (error instanceof ValidationError) {
        toast({
          title: "参数验证失败",
          description: error.message,
          variant: "destructive",
        });
        return; // 验证错误不需要抛出
      }
      
      const message = error instanceof Error ? error.message : "生成背景图失败";
      setErrorState(message);
      console.error("生成背景图失败:", error);
      throw error; // 重新抛出错误以便对话框处理
    }
  }, [refreshStoryData, toast]);

  // Asset library handlers - 应用角色和场景到选中的分镜
  const handleAssetCharacterSelect = useCallback(
    async (character: { id: string; name: string }) => {
      const success = await applyCharacterToPanels(character);
      if (success) {
        setSidebarOpen(false);
      }
    },
    [applyCharacterToPanels]
  );

  const handleSceneSelect = useCallback(
    async (scene: { id: string; name: string }) => {
      const success = await applySceneToPanels(scene);
      if (success) {
        setSidebarOpen(false);
      }
    },
    [applySceneToPanels]
  );

  // Sync form with fetched data
  useEffect(() => {
    if (!data?.story || uiState.editMode) return;

    uiActions.setStoryForm({
      title: data.story.title,
      premise: data.story.premise || "",
      comic_style_id: data.story.comic_style_id || null,
      style_reference_image: data.story.style_reference_image || null,
    });
  }, [data?.story, uiActions, uiState.editMode]);

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
    projectId: data?.projectId || null,
    story: data?.story || null,
    panels: data?.panels || [],
    chapters: data?.chapters || [],
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

  if (!data?.story) {
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
                  title={data.story.title}
                  chapters={data.chapters || []}
                  panels={data.panels || []}
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
                  sourceNovel={data?.sourceNovel || null}
                  sourceNovelId={data?.story.source_novel_id || null}
                  storyId={storyId}
                />

                {/* 小说角色同步提示 */}
                <NovelCharacterSyncPrompt
                  shouldShow={novelCharacterSync.shouldShowSyncPrompt}
                  novelTitle={data?.sourceNovel?.title || ""}
                  unmatchedCount={
                    novelCharacterSync.charactersWithStatus.filter((c) => !c.generated).length
                  }
                  onSyncClick={novelCharacterSync.openDialog}
                />

                {/* 空状态引导和智能提示 */}
                <ScriptPageGuidance
                  progressStats={progressStats}
                  chapters={data.chapters || []}
                  nextChapterOrder={nextChapterOrder}
                  onCreateChapter={() => {
                    uiActions.openChapterDialog("create", nextChapterOrder);
                  }}
                  onGeneratePanelsForChapter={handleGeneratePanelsForChapter}
                  onSetCurrentChapter={uiActions.setCurrentChapter}
                />

                {/* Tab 导航 */}
                <ScriptPageTabs
                  activeTab={uiState.activeTab}
                  storyId={storyId}
                  projectId={data?.projectId || null}
                  sourceNovelId={data?.story.source_novel_id || null}
                  storyTitle={data.story.title}
                  storyStyle={data.story?.style || undefined}
                  chapters={data.chapters || []}
                  panels={data.panels || []}
                  storyCharacters={storyCharacters}
                  characterAssets={characterAssets}
                  isCharactersLoading={isCharactersLoading}
                  isGenerating={isGenerating}
                  streamingPanels={progress.generatedPanels || []}
                  progressStats={progressStats}
                  nextChapterOrder={nextChapterOrder}
                  onTabChange={(value) =>
                    uiActions.setActiveTab(value as typeof uiState.activeTab)
                  }
                  onCreateChapter={() => {
                    uiActions.openChapterDialog("create", nextChapterOrder);
                  }}
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

                {/* 对话框管理器 */}
                <DialogsManager
                  storyId={storyId}
                  projectId={data?.projectId || null}
                  panels={data?.panels || []}
                  uiState={uiState}
                  uiActions={uiActions}
                  nextChapterOrder={nextChapterOrder}
                  suggestedCharacters={data?.story?.suggested_characters || []}
                  storyCharacters={storyCharacters}
                  novelCharacterSync={novelCharacterSync}
                  onRefresh={refreshStoryData}
                  onRefetchStoryCharacters={async () => {
                    await refetchStoryCharacters();
                  }}
                  onExecuteGeneration={executeGeneration}
                />

                {/* 导入文本对话框 */}
                <ImportTextDialog
                  open={importTextDialogOpen}
                  onOpenChange={setImportTextDialogOpen}
                  storyId={storyId}
                  projectId={data?.projectId || ""}
                  onSuccess={() => {
                    setImportTextDialogOpen(false);
                    void refreshStoryData();
                    toast({
                      title: "导入成功",
                      description: "已成功生成分镜，刷新页面查看",
                    });
                  }}
                />

                {/* 九宫格对话框 */}
                <NineGridDialog
                  open={nineGridDialogOpen}
                  onOpenChange={setNineGridDialogOpen}
                  storyId={storyId}
                  projectId={projectId}
                  chapters={chapters}
                  onSuccess={handleNineGridSuccess}
                />

                {/* 资源库侧边栏 (新布局) */}
                {FEATURE_FLAGS.NEW_ASSET_SIDEBAR && (
                  <AssetLibrarySidebarSheet
                    open={sidebarOpen}
                    storyId={storyId}
                    projectId={data?.projectId || null}
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
