/**
 * 优化后的剧本详情页示例
 * 
 * 主要改进：
 * 1. 使用统一的 Dialog 状态管理
 * 2. 移除重复的组件
 * 3. 使用受控 Tab 组件
 * 4. 优化局部更新逻辑
 * 5. 改进错误处理
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { useUIState } from "./hooks/useUIState";
import { formatErrorForToast } from "./utils/errorHandling";
import type { CharacterRole } from "@/components/StoryCharacter/types";
import { useStreamingGeneration } from "./hooks/useStreamingGeneration";
import { GenerationProgress } from "./components/GenerationProgress";
import { GeneratePanelsDialog } from "./components/GeneratePanelsDialog";
import { useStoryOperation } from "./hooks/useStoryOperations";
import { SerialChapterList } from "@/components/SerialChapterList";
import { CreateChapterDialog } from "@/components/CreateChapterDialog";
// ✅ 导入优化的 Hook
import { useDialogState } from "./optimizations/useDialogState";
import { useQueryClient } from "@tanstack/react-query";

export default function ScriptDetailsPageOptimized() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const storyId = params.id as string;
  const { execute } = useStoryOperation();
  const queryClient = useQueryClient();

  // ✅ 使用统一的 Dialog 状态管理
  const dialog = useDialogState();
  
  // ✅ 使用受控 Tab
  const [activeTab, setActiveTab] = useState("panels");
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);

  // Data fetching hooks - 优先级加载
  const { 
    data, 
    isLoading, 
    isPanelsLoading, 
    error, 
    refetchPanels, 
    refetchStory,
    hasStory,
  } = useStoryDataOptimized(storyId);

  // ✅ 延迟加载次要数据
  const { 
    data: characterAssets = [], 
    isLoading: isCharactersLoading, 
    refetch: refetchCharacters 
  } = useCharacterAssets({ enabled: hasStory });

  const { 
    data: storyCharacters = [], 
    isLoading: isStoryCharactersLoading, 
    refetch: refetchStoryCharacters 
  } = useStoryCharacters(storyId, { enabled: hasStory });

  // ✅ 简化刷新逻辑
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

  // UI state
  const { state: uiState, actions: uiActions } = useUIState();

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

  // ✅ 改进的错误处理
  useEffect(() => {
    if (!error) return;

    const errorInfo = formatErrorForToast(error);
    
    // 根据错误类型提供不同的操作
    if (error instanceof Response) {
      if (error.status === 404) {
        toast({
          title: "故事不存在",
          description: "该故事可能已被删除",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/scripts')}
            >
              返回列表
            </Button>
          ),
        });
        return;
      }
      
      if (error.status === 403) {
        toast({
          title: "无权访问",
          description: "您没有权限查看此故事",
          variant: "destructive",
        });
        return;
      }
    }

    // 通用错误处理 - 提供重试选项
    toast({
      title: errorInfo.title,
      description: errorInfo.description,
      variant: "destructive",
      action: (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => void refreshStoryData()}
        >
          重试
        </Button>
      ),
    });
  }, [error, toast, router, refreshStoryData]);

  // Event handlers
  async function handleUpdateStory() {
    await execute(
      async () => {
        await updateStory.mutateAsync(uiState.storyForm);
        uiActions.setEditMode(false);
      },
      { successMessage: "剧本已保存" }
    );
  }

  // ✅ 优化：使用局部更新而非全量刷新
  async function handleImageGenerated(panelId: string, imageUrl: string) {
    // 直接更新缓存，避免重新请求
    queryClient.setQueriesData(
      { queryKey: ['story-panels', storyId] },
      (old: { panels: Array<{ id: string; generated_image?: string }> } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          panels: old.panels.map(p =>
            p.id === panelId ? { ...p, generated_image: imageUrl } : p
          ),
        };
      }
    );
    
    toast({ title: "图片生成成功" });
  }

  async function handleDeletePanel(panelId: string): Promise<void> {
    await execute(
      async () => {
        const response = await fetch(`/api/panel/${panelId}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "删除分镜失败");
        }
        
        // ✅ 删除成功后立即更新缓存
        queryClient.setQueriesData(
          { queryKey: ['story-panels', storyId] },
          (old: { panels: Array<{ id: string }> } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              panels: old.panels.filter(p => p.id !== panelId),
            };
          }
        );
      },
      { successMessage: "分镜已删除" }
    );
  }

  async function handleAddCharacter(characterId: string, role: CharacterRole): Promise<void> {
    await execute(
      async () => {
        await addStoryCharacter.mutateAsync({ characterId, role });
      },
      { successMessage: "角色已添加到故事" }
    );
  }

  async function handleRemoveCharacter(characterId: string): Promise<void> {
    await execute(
      async () => {
        await removeStoryCharacter.mutateAsync(characterId);
      },
      { successMessage: "角色已从故事移除" }
    );
  }

  async function handleCharacterRoleChange(characterId: string, role: CharacterRole): Promise<void> {
    await execute(
      async () => {
        await updateStoryCharacterRole.mutateAsync({ characterId, role });
      },
      { successMessage: "角色类型已更新" }
    );
  }

  async function handleGeneratePanelsForChapter(chapterId: string): Promise<void> {
    if (!data?.story) {
      toast({ title: "故事不存在", variant: "destructive" });
      return;
    }

    const existingPanelCount = (data.panels || []).filter(
      p => p.chapter_id === chapterId
    ).length;

    // ✅ 使用统一的 Dialog 状态管理
    dialog.openGeneratePanelsDialog(chapterId, existingPanelCount);
  }

  async function executeGeneration(
    chapterId: string,
    mode: "overwrite" | "append",
    panelCount?: number
  ): Promise<void> {
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
          const error = await createProjectRes.json();
          throw new Error(error.error || "创建项目失败");
        }
        const createProjectData = await createProjectRes.json();
        projectId = createProjectData.project.id;
        await refetchPanels?.();
      }

      // Generate panels with streaming
      await generate({
        chapterId,
        projectId: projectId,
        overwrite: mode === "overwrite",
        panelCount,
      });

      toast({
        title: "分镜生成完成",
        description: mode === "overwrite"
          ? "AI 已成功重新生成分镜脚本"
          : "AI 已成功追加新的分镜脚本",
      });
      reset();
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        const errorInfo = formatErrorForToast(error);
        toast({
          title: errorInfo.title,
          description: errorInfo.description,
          variant: "destructive",
        });
      }
    }
  }

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
            <Button onClick={() => router.push("/scripts")}>
              返回列表
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
                <LeftSidebar
                  story={data.story}
                  editMode={uiState.editMode}
                  storyForm={uiState.storyForm}
                  saving={updateStory.isPending}
                  onEditModeToggle={() => uiActions.setEditMode(true)}
                  onCancel={() => uiActions.setEditMode(false)}
                  onSave={handleUpdateStory}
                  onAutoSave={async (formData) => {
                    await updateStory.mutateAsync(formData);
                  }}
                  onFormChange={(field, value) =>
                    uiActions.updateStoryForm({ [field]: value })
                  }
                  storyId={storyId}
                  currentChapterId={currentChapterId}
                  onChapterSelect={setCurrentChapterId}
                  storyCharacters={storyCharacters}
                  onAddCharacter={handleAddCharacter}
                  onRemoveCharacter={handleRemoveCharacter}
                  onCharacterRoleChange={handleCharacterRoleChange}
                  isStoryCharactersLoading={isStoryCharactersLoading}
                  onRefreshStoryCharacters={() => refetchStoryCharacters()}
                />

                <div className="lg:col-span-3">
                  {/* ✅ 使用受控 Tab */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="panels">分镜列表</TabsTrigger>
                      <TabsTrigger value="gallery">生成图库</TabsTrigger>
                      <TabsTrigger value="serial">连载管理</TabsTrigger>
                    </TabsList>

                    <TabsContent value="panels">
                      <PanelTab
                        panels={data?.panels || []}
                        projectId={data?.projectId || null}
                        storyId={storyId}
                        currentChapterId={currentChapterId}
                        currentChapterTitle={
                          currentChapterId
                            ? data.chapters?.find((ch) => ch.id === currentChapterId)?.title
                            : null
                        }
                        characters={characterAssets}
                        charactersLoading={isCharactersLoading}
                        onCharactersRefresh={() => { refetchCharacters(); }}
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

                    <TabsContent value="gallery">
                      <StoryImagesGallery storyId={storyId} projectId={data?.projectId} />
                    </TabsContent>

                    <TabsContent value="serial">
                      <SerialChapterList
                        storyId={storyId}
                        chapters={data.chapters || []}
                        panels={data.panels || []}
                        onRefresh={refreshStoryData}
                        onCreateChapter={() => {
                          const nextOrder = (data.chapters || []).length > 0
                            ? Math.max(...(data.chapters || []).map(ch => ch.chapter_order)) + 1
                            : 1;
                          dialog.openCreateChapterDialog(nextOrder);
                        }}
                        onGenerateNext={() => {
                          const nextOrder = (data.chapters || []).length > 0
                            ? Math.max(...(data.chapters || []).map(ch => ch.chapter_order)) + 1
                            : 1;
                          dialog.openGenerateNextChapterDialog(nextOrder);
                        }}
                        onGeneratePanels={(chapterId) => {
                          setCurrentChapterId(chapterId);
                          handleGeneratePanelsForChapter(chapterId);
                        }}
                        onViewPanels={(chapterId) => {
                          setCurrentChapterId(chapterId);
                          // ✅ 使用状态切换而非 DOM 操作
                          setActiveTab("panels");
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <GenerationProgress progress={progress} onCancel={cancel} />

              {/* ✅ 使用统一的 Dialog 管理 */}
              <GeneratePanelsDialog
                open={dialog.isOpen('generate-panels')}
                existingPanelCount={dialog.state.data?.existingPanelCount || 0}
                onOpenChange={(open) => !open && dialog.closeDialog()}
                onConfirm={(mode, panelCount) => {
                  const chapterId = dialog.state.data?.chapterId;
                  if (chapterId) {
                    executeGeneration(chapterId, mode, panelCount);
                    dialog.closeDialog();
                  }
                }}
              />

              {/* ✅ 移除重复，合并为一个 */}
              <CreateChapterDialog
                open={dialog.isAnyOpen && (
                  dialog.isOpen('create-chapter') || 
                  dialog.isOpen('generate-next-chapter')
                )}
                onOpenChange={(open) => !open && dialog.closeDialog()}
                storyId={storyId}
                nextChapterOrder={dialog.state.data?.nextChapterOrder || 1}
                onSuccess={() => {
                  void refreshStoryData();
                  dialog.closeDialog();
                }}
              />
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

