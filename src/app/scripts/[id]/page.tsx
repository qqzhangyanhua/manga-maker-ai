"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Landing";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StoryHeader } from "./components/StoryHeader";
import { LeftSidebar } from "./components/LeftSidebar";
import { PanelTab } from "./components/PanelTab";
import { StoryDetailsSkeleton } from "./components/StoryDetailsSkeleton";
import { StoryImagesGallery } from "./components/StoryImagesGallery";
import { useUpdateStory } from "./hooks/useStoryData";
import { useStoryDataOptimized } from "./hooks/useStoryDataOptimized";
import { useCharacterAssets } from "./hooks/useCharacterAssets";
import {
  useStoryCharacters,
  useAddStoryCharacter,
  useRemoveStoryCharacter,
  useUpdateStoryCharacterRole,
} from "./hooks/useStoryCharacters";
import { useUIState, TAB_VALUES } from "./hooks/useUIState";
import { formatErrorForToast } from "./utils/errorHandling";
import type { CharacterRole } from "@/components/StoryCharacter/types";
import { useStreamingGeneration } from "./hooks/useStreamingGeneration";
import { GenerationProgress } from "./components/GenerationProgress";
import { GeneratePanelsDialog } from "./components/GeneratePanelsDialog";
import { useStoryOperation } from "./hooks/useStoryOperations";
import { SerialChapterList } from "@/components/SerialChapterList";
import { CreateChapterDialog } from "@/components/CreateChapterDialog";
import { ScriptEditorProvider } from "./contexts/ScriptEditorContext";
import type {
  ScriptEditorDataContext,
  ScriptEditorUIContext,
  ScriptEditorOperationsContext,
} from "./types/context.types";

export default function ScriptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const storyId = params.id as string;
  const { execute } = useStoryOperation();

  // Data fetching hooks
  const { data, isLoading, isPanelsLoading, error, refetchPanels, refetchStory, hasStory } =
    useStoryDataOptimized(storyId);

  // 等核心数据加载完成后再加载次要数据（请求优先级控制）
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

  // Mutation hooks
  const updateStory = useUpdateStory(storyId);
  const addStoryCharacter = useAddStoryCharacter(storyId);
  const removeStoryCharacter = useRemoveStoryCharacter(storyId);
  const updateStoryCharacterRole = useUpdateStoryCharacterRole(storyId);

  // Streaming generation
  const { progress, isGenerating, generate, cancel, reset } = useStreamingGeneration();

  // UI state - 使用扩展后的 useUIState
  const { state: uiState, actions: uiActions } = useUIState();

  // Sync form with fetched data
  useEffect(() => {
    // 避免覆盖用户正在编辑的内容，仅在进入页面或后端数据变更时同步
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

  // Computed: 下一个章节序号
  const nextChapterOrder = useMemo(() => {
    const chapters = data?.chapters || [];
    return chapters.length > 0 ? Math.max(...chapters.map((ch) => ch.chapter_order)) + 1 : 1;
  }, [data?.chapters]);

  // Event handlers
  const handleUpdateStory = useCallback(async () => {
    await execute(
      async () => {
        await updateStory.mutateAsync(uiState.storyForm);
        uiActions.setEditMode(false);
      },
      { successMessage: "剧本已保存" }
    );
  }, [execute, updateStory, uiState.storyForm, uiActions]);

  const handleImageGenerated = useCallback(
    async (panelId: string, imageUrl: string) => {
      // 局部更新缓存，避免全量刷新
      queryClient.setQueriesData(
        { queryKey: ["story-panels", storyId] },
        (old: { panels: Array<{ id: string; generated_image?: string }> } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            panels: old.panels.map((p) =>
              p.id === panelId ? { ...p, generated_image: imageUrl } : p
            ),
          };
        }
      );
      toast({ title: "图片生成成功" });
    },
    [queryClient, storyId, toast]
  );

  const handleDeletePanel = useCallback(
    async (panelId: string): Promise<void> => {
      await execute(
        async () => {
          const response = await fetch(`/api/panel/${panelId}`, { method: "DELETE" });
          if (!response.ok) {
            const responseData = await response.json();
            throw new Error(responseData.error || "删除分镜失败");
          }
        },
        { successMessage: "分镜已删除" }
      );
    },
    [execute]
  );

  const handleAddCharacter = useCallback(
    async (characterId: string, role: CharacterRole): Promise<void> => {
      await execute(
        async () => {
          await addStoryCharacter.mutateAsync({ characterId, role });
        },
        { successMessage: "角色已添加到故事" }
      );
    },
    [execute, addStoryCharacter]
  );

  const handleRemoveCharacter = useCallback(
    async (characterId: string): Promise<void> => {
      await execute(
        async () => {
          await removeStoryCharacter.mutateAsync(characterId);
        },
        { successMessage: "角色已从故事移除" }
      );
    },
    [execute, removeStoryCharacter]
  );

  const handleCharacterRoleChange = useCallback(
    async (characterId: string, role: CharacterRole): Promise<void> => {
      await execute(
        async () => {
          await updateStoryCharacterRole.mutateAsync({ characterId, role });
        },
        { successMessage: "角色类型已更新" }
      );
    },
    [execute, updateStoryCharacterRole]
  );

  const handleGeneratePanelsForChapter = useCallback(
    async (chapterId: string): Promise<void> => {
      if (!data?.story) {
        toast({ title: "故事不存在", variant: "destructive" });
        return;
      }
      uiActions.openGenerateDialog(chapterId);
    },
    [data?.story, toast, uiActions]
  );

  const executeGeneration = useCallback(
    async (chapterId: string, mode: "overwrite" | "append", panelCount?: number): Promise<void> => {
      if (!data?.story) {
        toast({ title: "故事不存在", variant: "destructive" });
        return;
      }
      try {
        let projectId = data.projectId;

        // Create project if not exists
        if (!projectId) {
          const createProjectRes = await fetch("/api/project", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: data.story.title,
              description: data.story.premise || "AI生成的漫画项目",
              story_id: storyId,
            }),
          });

          if (!createProjectRes.ok) {
            const createError = await createProjectRes.json();
            throw new Error(createError.error || "创建项目失败");
          }
          const createProjectData = await createProjectRes.json();
          projectId = createProjectData.project.id;
          await refetchPanels?.();
        }

        // Generate panels with streaming
        await generate({
          chapterId,
          projectId: projectId as string,
          overwrite: mode === "overwrite",
          panelCount,
        });

        toast({
          title: "分镜生成完成",
          description:
            mode === "overwrite" ? "AI 已成功重新生成分镜脚本" : "AI 已成功追加新的分镜脚本",
        });
        reset();
      } catch (genError) {
        if (genError instanceof Error && genError.name !== "AbortError") {
          const errorInfo = formatErrorForToast(genError);
          toast({
            title: errorInfo.title,
            description: errorInfo.description,
            variant: "destructive",
          });
        }
      }
    },
    [data?.story, data?.projectId, storyId, generate, reset, toast, refetchPanels]
  );

  // 准备 Context Values
  const dataContextValue = useMemo<ScriptEditorDataContext>(
    () => ({
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
    }),
    [
      storyId,
      data,
      characterAssets,
      storyCharacters,
      isLoading,
      isPanelsLoading,
      isCharactersLoading,
      isStoryCharactersLoading,
      refreshStoryData,
      refetchCharacters,
      refetchStoryCharacters,
    ]
  );

  const uiContextValue = useMemo<ScriptEditorUIContext>(
    () => ({
      state: uiState,
      actions: uiActions,
    }),
    [uiState, uiActions]
  );

  const operationsContextValue = useMemo<ScriptEditorOperationsContext>(
    () => ({
      updateStory: handleUpdateStory,
      isSaving: updateStory.isPending,
      addCharacter: handleAddCharacter,
      removeCharacter: handleRemoveCharacter,
      updateCharacterRole: handleCharacterRoleChange,
      deletePanel: handleDeletePanel,
      onImageGenerated: handleImageGenerated,
      handleGeneratePanelsForChapter,
      executeGeneration,
      isGenerating,
      getNextChapterOrder: () => nextChapterOrder,
    }),
    [
      handleUpdateStory,
      updateStory.isPending,
      handleAddCharacter,
      handleRemoveCharacter,
      handleCharacterRoleChange,
      handleDeletePanel,
      handleImageGenerated,
      handleGeneratePanelsForChapter,
      executeGeneration,
      isGenerating,
      nextChapterOrder,
    ]
  );

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

            <div className="relative px-4 py-12">
              <div className="max-w-7xl mx-auto relative space-y-8">
                <StoryHeader story={data.story} onBack={() => router.push("/scripts")} />

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* LeftSidebar 现在从 Context 获取数据 */}
                  <LeftSidebar />

                  <div className="lg:col-span-3">
                    <Tabs
                      value={uiState.activeTab}
                      onValueChange={(value) => uiActions.setActiveTab(value as typeof uiState.activeTab)}
                      className="w-full"
                    >
                      <TabsList className="mb-4">
                        <TabsTrigger value={TAB_VALUES.PANELS}>分镜列表</TabsTrigger>
                        <TabsTrigger value={TAB_VALUES.GALLERY}>生成图库</TabsTrigger>
                        <TabsTrigger value={TAB_VALUES.SERIAL}>连载管理</TabsTrigger>
                      </TabsList>

                      <TabsContent value={TAB_VALUES.PANELS}>
                        <PanelTab
                          panels={data?.panels || []}
                          projectId={data?.projectId || null}
                          storyId={storyId}
                          currentChapterId={uiState.currentChapterId}
                          currentChapterTitle={
                            uiState.currentChapterId
                              ? data.chapters?.find((ch) => ch.id === uiState.currentChapterId)?.title
                              : null
                          }
                          characters={characterAssets}
                          charactersLoading={isCharactersLoading}
                          onCharactersRefresh={() => refetchCharacters()}
                          onGeneratePanelsForChapter={handleGeneratePanelsForChapter}
                          isGeneratingPanels={isGenerating}
                          streamingPanels={progress.generatedPanels || []}
                          onDeletePanel={handleDeletePanel}
                          onImageGenerated={handleImageGenerated}
                          onRefresh={refreshStoryData}
                          onError={(msg) =>
                            toast({ title: "错误", description: msg, variant: "destructive" })
                          }
                          isPanelsLoading={isPanelsLoading}
                        />
                      </TabsContent>

                      <TabsContent value={TAB_VALUES.GALLERY}>
                        <StoryImagesGallery storyId={storyId} projectId={data?.projectId} />
                      </TabsContent>

                      <TabsContent value={TAB_VALUES.SERIAL}>
                        <SerialChapterList
                          storyId={storyId}
                          chapters={data.chapters || []}
                          panels={data.panels || []}
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
                          onViewPanels={(chapterId) => {
                            uiActions.setCurrentChapter(chapterId);
                            uiActions.setActiveTab(TAB_VALUES.PANELS);
                          }}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>

                <GenerationProgress progress={progress} onCancel={cancel} />

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
