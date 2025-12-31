"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Landing";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
import { ScriptEditorProvider } from "./contexts/ScriptEditorContext";

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
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
    }
  }, [error, toast]);

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
                {/* 顶部标题区域 */}
                <ScriptPageHeader
                  title={data.story.title}
                  chapters={data.chapters || []}
                  panels={data.panels || []}
                  onCreateChapter={() => {
                    uiActions.openChapterDialog("create", nextChapterOrder);
                  }}
                />

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
                      章节创作
                    </TabsTrigger>
                    <TabsTrigger
                      value={TAB_VALUES.GALLERY}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent bg-transparent px-4 py-3 text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none"
                    >
                      素材库
                    </TabsTrigger>
                    <TabsTrigger
                      value={TAB_VALUES.LAYOUT}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent bg-transparent px-4 py-3 text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none"
                    >
                      排版导出
                    </TabsTrigger>
                  </TabsList>

                  {/* 章节创作视图 */}
                  <TabsContent value={TAB_VALUES.SERIAL} className="mt-0">
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
              </div>
            </div>
          </main>
        </div>
      </ScriptEditorProvider>
    </ErrorBoundary>
  );
}
