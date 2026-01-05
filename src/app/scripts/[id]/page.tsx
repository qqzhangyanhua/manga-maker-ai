"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Landing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Lock, BookOpen, Sparkles, PanelRight } from "lucide-react";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { AssetLibrarySidebar } from "@/components/AssetLibrarySidebar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StoryDetailsSkeleton } from "./components/StoryDetailsSkeleton";
import { StoryImagesGallery } from "./components/StoryImagesGallery";
import { ScriptPageHeader } from "./components/ScriptPageHeader";
import { LayoutExportTab } from "./components/LayoutExportTab";
import { useStoryDataOptimized } from "./hooks/useStoryDataOptimized";
import { useCharacterAssets } from "./hooks/useCharacterAssets";
import { useStoryCharacters } from "./hooks/useStoryCharacters";
import { useUIState, TAB_VALUES } from "./hooks/useUIState";
import { useScriptPageHandlers } from "./hooks/useScriptPageHandlers";
import { useScriptContextValues } from "./hooks/useScriptContextValues";
import { formatErrorForToast } from "./utils/errorHandling";
import { GenerationProgress } from "./components/GenerationProgress";
import { GeneratePanelsDialog } from "./components/GeneratePanelsDialog";
import { SerialChapterList } from "@/components/SerialChapterList";
import { CreateChapterDialog } from "@/components/CreateChapterDialog";
import { ImportTextDialog } from "@/components/StoryScript/ImportTextDialog";
import { ScriptEditorProvider } from "./contexts/ScriptEditorContext";
import { EmptyState } from "@/components/common/EmptyState";
import { ActionPrompt } from "@/components/common/ActionPrompt";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { BatchOperationBar } from "@/components/common/BatchOperationBar";
import { useProgressCalculation } from "@/hooks/useProgressCalculation";
import { useBatchSelection } from "@/hooks/useBatchSelection";
import { FocusMode } from "./components/FocusMode";

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
    chapters: (data?.chapters || []) as any,
    panels: (data?.panels || []) as any,
  });

  // Batch selection for panels
  const panelSelection = useBatchSelection(
    data?.panels || [],
    { getId: (panel: { id: string }) => panel.id }
  );

  // Batch operations state
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  // Error state management
  const [errorState, setErrorState] = useState<string | null>(null);

  // Sidebar state (for new layout)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Import text dialog state
  const [importTextDialogOpen, setImportTextDialogOpen] = useState(false);

  // AlertDialog state for batch delete confirmation
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);

  // Focus mode state
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const [focusModeInitialPanelId, setFocusModeInitialPanelId] = useState<string | null>(null);

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

  // Batch operations handlers
  const handleBatchGenerate = useCallback(async () => {
    const selectedIds = panelSelection.getSelectedItems();
    const selectedPanels = (data?.panels || []).filter((p: { id: string }) =>
      selectedIds.includes(p.id)
    );
    if (selectedPanels.length === 0) return;

    // 过滤出有 prompt_used 的分镜
    const panelsWithPrompt = selectedPanels.filter((p: { prompt_used?: string }) => p.prompt_used);
    if (panelsWithPrompt.length === 0) {
      setErrorState("选中的分镜都没有提示词，请先生成提示词");
      return;
    }

    setBatchGenerating(true);
    setBatchProgress({ current: 0, total: panelsWithPrompt.length });

    try {
      const response = await fetch("/api/panel/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: panelsWithPrompt.map((p: { id: string }) => p.id),
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

      // 清除选择并刷新数据
      panelSelection.deselectAll();
      await refetchPanels();
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量生成失败";
      setErrorState(message);
      console.error("批量生成失败:", error);
    } finally {
      setBatchGenerating(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  }, [panelSelection, refetchPanels, toast]);

  const handleBatchDelete = useCallback(async () => {
    const selectedCount = panelSelection.selectedCount;
    if (selectedCount === 0) return;

    // 打开确认对话框
    setShowBatchDeleteDialog(true);
  }, [panelSelection.selectedCount]);

  // 确认批量删除
  const confirmBatchDelete = useCallback(async () => {
    try {
      const response = await fetch("/api/panel/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: Array.from(panelSelection.selected),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "批量删除失败");
      }

      toast({
        title: "删除成功",
        description: `已删除 ${panelSelection.selectedCount} 个分镜`,
      });

      // 清除选择并刷新数据
      panelSelection.deselectAll();
      await refetchPanels();
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量删除失败";
      setErrorState(message);
      console.error("批量删除失败:", error);
    } finally {
      setShowBatchDeleteDialog(false);
    }
  }, [panelSelection, refetchPanels, toast]);

  // Asset library handlers
  const handleCharacterSelect = useCallback((character: { id: string; name: string }) => {
    toast({
      title: "角色已选择",
      description: `已选择角色: ${character.name}`,
    });
    // TODO: 实现角色应用到分镜的逻辑
    setSidebarOpen(false);
  }, [toast]);

  const handleSceneSelect = useCallback((scene: { id: string; name: string }) => {
    toast({
      title: "场景已选择",
      description: `已选择场景: ${scene.name}`,
    });
    // TODO: 实现场景应用到分镜的逻辑
    setSidebarOpen(false);
  }, [toast]);

  // Import text success handler
  const handleImportTextSuccess = useCallback((chapterId: string) => {
    setImportTextDialogOpen(false);
    // 刷新数据
    void refreshStoryData();
    // 可选：跳转到新生成的章节
    toast({
      title: "导入成功",
      description: "已成功生成分镜，刷新页面查看",
    });
  }, [refreshStoryData, toast]);

  // Focus mode handlers
  const handleEnterFocusMode = useCallback((panelId?: string) => {
    setFocusModeInitialPanelId(panelId || null);
    setFocusModeEnabled(true);
  }, []);

  const handleExitFocusMode = useCallback(() => {
    setFocusModeEnabled(false);
    setFocusModeInitialPanelId(null);
    // 刷新数据以获取最新状态
    void refreshStoryData();
  }, [refreshStoryData]);

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

  // 如果启用了专注模式，渲染专注模式组件
  if (focusModeEnabled) {
    return (
      <FocusMode
        storyId={storyId}
        projectId={data?.projectId || null}
        panels={data?.panels || []}
        chapters={data?.chapters || []}
        characters={characterAssets}
        initialPanelId={focusModeInitialPanelId}
        onExit={handleExitFocusMode}
        onPanelUpdate={refreshStoryData}
      />
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
                      panels={(data.panels || []) as any}
                      onCreateChapter={() => {
                        uiActions.openChapterDialog("create", nextChapterOrder);
                      }}
                      onImportText={() => {
                        setImportTextDialogOpen(true);
                      }}
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
                    {/* 批量操作工具栏 */}
                    {panelSelection.selectedCount > 0 && (
                      <div className="mb-4">
                        <BatchOperationBar
                          selectedCount={panelSelection.selectedCount}
                          totalCount={data?.panels.length || 0}
                          onSelectAll={panelSelection.selectAll}
                          onDeselectAll={panelSelection.deselectAll}
                          onBatchGenerate={handleBatchGenerate}
                          onBatchDelete={handleBatchDelete}
                          isGenerating={batchGenerating}
                          generatingProgress={batchProgress}
                        />
                      </div>
                    )}

                    <SerialChapterList
                      storyId={storyId}
                      projectId={data?.projectId || null}
                      chapters={data.chapters || []}
                      panels={data.panels || []}
                      characters={characterAssets}
                      charactersLoading={isCharactersLoading}
                      isGeneratingPanels={isGenerating}
                      streamingPanels={progress.generatedPanels || []}
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
                      onDeletePanel={handleDeletePanel}
                      onImageGenerated={handleImageGenerated}
                      onCharactersRefresh={() => refetchCharacters()}
                      onError={(msg) =>
                        toast({ title: "错误", description: msg, variant: "destructive" })
                      }
                    />
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

                <GeneratePanelsDialog
                  open={uiState.generateDialog.open}
                  existingPanelCount={
                    uiState.generateDialog.pendingChapterId
                      ? (data?.panels || []).filter(
                          (p) => p.chapter_id === uiState.generateDialog.pendingChapterId
                        ).length
                      : 0
                  }
                  onOpenChange={(open) => {
                    if (!open) uiActions.closeGenerateDialog();
                  }}
                  onConfirm={(mode, panelCount) => {
                    if (uiState.generateDialog.pendingChapterId) {
                      executeGeneration(uiState.generateDialog.pendingChapterId, mode, panelCount);
                    }
                  }}
                />

                <CreateChapterDialog
                  open={uiState.chapterDialog.open}
                  onOpenChange={(open) => {
                    if (!open) uiActions.closeChapterDialog();
                  }}
                  storyId={storyId}
                  nextChapterOrder={uiState.chapterDialog.nextOrder}
                  onSuccess={() => {
                    void refreshStoryData();
                  }}
                />

                {/* 导入文本对话框 */}
                <ImportTextDialog
                  open={importTextDialogOpen}
                  onOpenChange={setImportTextDialogOpen}
                  storyId={storyId}
                  projectId={data?.projectId || ""}
                  onSuccess={handleImportTextSuccess}
                />

                {/* 资源库侧边栏 (新布局) */}
                {FEATURE_FLAGS.NEW_ASSET_SIDEBAR && (
                  <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                    <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
                      <SheetHeader className="px-6 py-4 border-b border-gray-800">
                        <SheetTitle>素材库</SheetTitle>
                      </SheetHeader>
                      <AssetLibrarySidebar
                        storyId={storyId}
                        projectId={data?.projectId || null}
                        characters={characterAssets}
                        scenes={[]}
                        isLoading={isCharactersLoading}
                        onCharacterSelect={handleCharacterSelect}
                        onSceneSelect={handleSceneSelect}
                      />
                    </SheetContent>
                  </Sheet>
                )}

                {/* 批量删除确认对话框 */}
                <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除</AlertDialogTitle>
                      <AlertDialogDescription>
                        确定要删除 {panelSelection.selectedCount} 个分镜吗？此操作无法撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={confirmBatchDelete} className="bg-destructive hover:bg-destructive/90">
                        删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </main>
        </div>
      </ScriptEditorProvider>
    </ErrorBoundary>
  );
}
