"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Landing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Lock, BookOpen, Sparkles, PanelRight } from "lucide-react";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { AssetLibrarySidebar } from "@/components/AssetLibrarySidebar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StoryDetailsSkeleton } from "./components/StoryDetailsSkeleton";
import { StoryImagesGallery } from "./components/StoryImagesGallery";
import { ScriptPageHeader } from "./components/ScriptPageHeader";
import { NovelSourceCard } from "./components/NovelSourceCard";
import { LayoutExportTab } from "./components/LayoutExportTab";
import { BatchOperationsManager } from "./components/BatchOperationsManager";
import { DialogsManager } from "./components/DialogsManager";
import { useStoryDataOptimized } from "./hooks/useStoryDataOptimized";
import { useCharacterAssets } from "./hooks/useCharacterAssets";
import { useStoryCharacters } from "./hooks/useStoryCharacters";
import { useUIState, TAB_VALUES } from "./hooks/useUIState";
import { useScriptPageHandlers } from "./hooks/useScriptPageHandlers";
import { useScriptContextValues } from "./hooks/useScriptContextValues";
import { useAssetApplication } from "./hooks/useAssetApplication";
import { formatErrorForToast } from "./utils/errorHandling";
import { GenerationProgress } from "./components/GenerationProgress";
import { SerialChapterList } from "@/components/SerialChapterList";
import { ImportTextDialog } from "@/components/StoryScript/ImportTextDialog";
import { ScriptEditorProvider } from "./contexts/ScriptEditorContext";
import { EmptyState } from "@/components/common/EmptyState";
import { ActionPrompt } from "@/components/common/ActionPrompt";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { useProgressCalculation } from "@/hooks/useProgressCalculation";
import { useBatchSelection } from "@/hooks/useBatchSelection";
import { StoryCharactersManager } from "./components/StoryCharactersManager";
import { useNovelCharacterSync } from "./hooks/useNovelCharacterSync";
import type { CharacterInfo } from "./types/character";

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

  const refreshStoryData = useCallback(async () => {
    await Promise.all([refetchStory(), refetchPanels()]);
  }, [refetchStory, refetchPanels]);

  // UI state
  const { state: uiState, actions: uiActions } = useUIState();

  // Progress calculation
  const progressStats = useProgressCalculation({
    chapters: data?.chapters || [],
    panels: data?.panels || [],
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

  // Novel character sync
  const novelCharacterSync = useNovelCharacterSync({
    storyId,
    sourceNovelId: data?.story?.source_novel_id || null,
    suggestedCharacters: data?.story?.suggested_characters || [],
    storyCharacters,
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

  // Computed: 下一个章节序号
  const nextChapterOrder = useMemo(() => {
    const chapters = data?.chapters || [];
    return chapters.length > 0 ? Math.max(...chapters.map((ch) => ch.chapter_order)) + 1 : 1;
  }, [data?.chapters]);

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

  // 生成章节背景图
  const handleGenerateBackground = useCallback(async (
    chapterId: string,
    params: { scene_type: string; style: string; prompt?: string; negative_prompt?: string }
  ) => {
    try {
      const response = await fetch(`/api/chapter/${chapterId}/generate-background`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
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
                <div className="flex items-center justify-between mb-6">
                  <div className="flex-1">
                    <ScriptPageHeader
                      title={data.story.title}
                      chapters={data.chapters || []}
                      panels={data.panels || []}
                      onCreateChapter={() => {
                        uiActions.openChapterDialog("create", nextChapterOrder);
                      }}
                      onImportText={() => setImportTextDialogOpen(true)}
                      onEnterFocusMode={() => handleEnterFocusMode()}
                    />
                  </div>

                  {/* 侧边栏触发按钮 (仅在新布局时显示) */}
                  {FEATURE_FLAGS.NEW_ASSET_SIDEBAR && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSidebarOpen(true)}
                      className="ml-4"
                    >
                      <PanelRight className="w-4 h-4 mr-2" />
                      素材库
                    </Button>
                  )}
                </div>

                {/* 小说来源信息卡片 */}
                <NovelSourceCard
                  sourceNovel={data?.sourceNovel || null}
                  sourceNovelId={data?.story.source_novel_id || null}
                  storyId={storyId}
                />

                {/* 小说角色同步提示 */}
                {novelCharacterSync.shouldShowSyncPrompt && (
                  <div className="mt-6">
                    <ActionPrompt
                      icon={<Sparkles className="w-full h-full" />}
                      message={`检测到此剧本来自小说「${data?.sourceNovel?.title || ""}」，发现 ${novelCharacterSync.charactersWithStatus.filter((c) => !c.generated).length} 个角色尚未同步`}
                      variant="info"
                      action={
                        <Button
                          onClick={novelCharacterSync.openDialog}
                          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          同步角色设定
                        </Button>
                      }
                    />
                  </div>
                )}

                {/* 空状态引导 */}
                {progressStats.stage === "empty" && (
                  <div className="mt-8">
                    <EmptyState
                      icon={<BookOpen className="w-full h-full" />}
                      title="开始创作你的漫画剧本"
                      description="创建第一个章节，然后生成分镜画面，开始你的漫画创作之旅"
                      action={
                        <Button
                          onClick={() => {
                            uiActions.openChapterDialog("create", nextChapterOrder);
                          }}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                        >
                          创建第一个章节
                        </Button>
                      }
                    />
                  </div>
                )}

                {/* 智能引导提示 */}
                {progressStats.stage === "chapter_created" && (
                  <div className="mt-6 mb-6">
                    <ActionPrompt
                      icon={<Sparkles className="w-full h-full" />}
                      message='章节已就绪！点击"生成分镜"让 AI 为你创作精彩画面'
                      variant="success"
                      action={
                        <Button
                          onClick={() => {
                            if (data.chapters && data.chapters.length > 0) {
                              uiActions.setCurrentChapter(data.chapters[0].id);
                              handleGeneratePanelsForChapter(data.chapters[0].id);
                            }
                          }}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        >
                          开始生成分镜
                        </Button>
                      }
                    />
                  </div>
                )}

                {/* Tab 导航 */}
                <Tabs
                  value={uiState.activeTab}
                  onValueChange={(value) => uiActions.setActiveTab(value as typeof uiState.activeTab)}
                  className="w-full"
                >
                  <TabsList className="mb-6 bg-transparent border-b border-gray-800 rounded-none w-full justify-start h-auto p-0">
                    <TabsTrigger
                      value={TAB_VALUES.SERIAL}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent bg-transparent px-4 py-3 text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none"
                    >
                      <div className="flex items-center gap-2">
                        <span>章节创作</span>
                        {progressStats.totalChapters > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {progressStats.completedChapters}/{progressStats.totalChapters}
                          </Badge>
                        )}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      value={TAB_VALUES.CHARACTERS}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent bg-transparent px-4 py-3 text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none"
                    >
                      <div className="flex items-center gap-2">
                        <span>关联角色</span>
                        {storyCharacters.length > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {storyCharacters.length}
                          </Badge>
                        )}
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      value={TAB_VALUES.GALLERY}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent bg-transparent px-4 py-3 text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none"
                      style={{ display: FEATURE_FLAGS.NEW_ASSET_SIDEBAR ? 'none' : 'flex' }}
                    >
                      素材库
                    </TabsTrigger>
                    <TabsTrigger
                      value={TAB_VALUES.LAYOUT}
                      disabled={progressStats.totalPanels === 0}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent bg-transparent px-4 py-3 text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <span>排版导出</span>
                        {progressStats.totalPanels === 0 && <Lock className="w-3 h-3" />}
                      </div>
                    </TabsTrigger>
                  </TabsList>

                  {/* 章节创作视图 */}
                  <TabsContent value={TAB_VALUES.SERIAL} className="mt-0">
                    {/* 批量操作管理器 */}
                    <BatchOperationsManager
                      panels={data?.panels || []}
                      onRefresh={refetchPanels}
                    />

                    <SerialChapterList
                      storyId={storyId}
                      projectId={data?.projectId || null}
                      chapters={data.chapters || []}
                      panels={data.panels || []}
                      characters={characterAssets}
                      charactersLoading={isCharactersLoading}
                      isGeneratingPanels={isGenerating}
                      streamingPanels={progress.generatedPanels || []}
                      storyStyle={data.story?.style || undefined}
                      onRefresh={refreshStoryData}
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
                      onCharactersRefresh={() => refetchCharacters()}
                      onError={(msg) =>
                        toast({ title: "错误", description: msg, variant: "destructive" })
                      }
                    />
                  </TabsContent>

                  {/* 关联角色视图 */}
                  <TabsContent value={TAB_VALUES.CHARACTERS} className="mt-0">
                    <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
                      <StoryCharactersManager
                        storyId={storyId}
                        sourceNovelId={data?.story.source_novel_id || null}
                        storyCharacters={storyCharacters}
                        onCharacterSelect={(character: CharacterInfo, role: string) => {
                          // 角色选择逻辑已在 StoryCharactersManager 内部处理
                        }}
                        onRefresh={() => refetchStoryCharacters()}
                      />
                    </div>
                  </TabsContent>

                  {/* 素材库视图 */}
                  <TabsContent value={TAB_VALUES.GALLERY} className="mt-0">
                    <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
                      <StoryImagesGallery storyId={storyId} projectId={data?.projectId} />
                    </div>
                  </TabsContent>

                  {/* 排版导出视图 */}
                  <TabsContent value={TAB_VALUES.LAYOUT} className="mt-0">
                    <LayoutExportTab
                      storyId={storyId}
                      projectId={data?.projectId || null}
                      chapters={data.chapters || []}
                      panels={data.panels || []}
                      storyTitle={data.story.title}
                    />
                  </TabsContent>
                </Tabs>

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
                  onRefetchStoryCharacters={refetchStoryCharacters}
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

                {/* 资源库侧边栏 (新布局) */}
                {FEATURE_FLAGS.NEW_ASSET_SIDEBAR && (
                  <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                    <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
                      <SheetHeader className="px-6 py-4 border-b border-gray-800">
                        <SheetTitle>素材库</SheetTitle>
                      </SheetHeader>
                      <div className="p-4 bg-blue-500/10 border-b border-blue-500/20">
                        <p className="text-sm text-blue-400">
                          💡 提示：先选择分镜，然后选择角色或场景，即可批量应用
                        </p>
                      </div>
                      <AssetLibrarySidebar
                        storyId={storyId}
                        projectId={data?.projectId || null}
                        characters={characterAssets}
                        scenes={[]}
                        isLoading={isCharactersLoading}
                        onCharacterSelect={handleAssetCharacterSelect}
                        onSceneSelect={handleSceneSelect}
                      />
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            </div>
          </main>
        </div>
      </ScriptEditorProvider>
    </ErrorBoundary>
  );
}
