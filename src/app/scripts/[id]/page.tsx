"use client";

import { useEffect, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StoryInfoPanel } from "./components/StoryInfoPanel";
import { ChapterList } from "./components/ChapterList";
import { PanelListView } from "./components/PanelListView";
import { PanelEditDialog } from "./components/PanelEditor/PanelEditDialog";
import { StoryDetailsSkeleton } from "./components/StoryDetailsSkeleton";
import { StoryImagesGallery } from "./components/StoryImagesGallery";
import type { Story, Panel } from "./types/script-editor.types";
import {
  useUpdateStory,
  useCreatePanel,
  useUpdatePanel,
  useDeletePanel,
} from "./hooks/useStoryData";
import { useStoryDataOptimized } from "./hooks/useStoryDataOptimized";
import { useCharacterAssets } from "./hooks/useCharacterAssets";
import {
  useStoryCharacters,
  useAddStoryCharacter,
  useRemoveStoryCharacter,
  useUpdateStoryCharacterRole,
} from "./hooks/useStoryCharacters";
import { useGeneratePanelsForChapter } from "./hooks/useChapterData";
import { useUIState } from "./hooks/useUIState";
import { formatErrorForToast, isRetryableError } from "./utils/errorHandling";
import { StoryCharacterList } from "@/components/StoryCharacter/StoryCharacterList";
import type { CharacterRole } from "@/components/StoryCharacter/types";
import { useStreamingGeneration } from "./hooks/useStreamingGeneration";
import { GenerationProgress } from "./components/GenerationProgress";

export default function ScriptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const storyId = params.id as string;

  // 当前章节状态
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);

  // React Query hooks for data management - 使用优化版渐进式加载
  const {
    data,
    isLoading,
    isPanelsLoading,
    error,
    hasStory,
    refetchPanels,
  } = useStoryDataOptimized(storyId);
  const {
    data: characterAssets = [],
    isLoading: isCharactersLoading,
    refetch: refetchCharacters,
  } = useCharacterAssets();

  // Story characters hooks
  const {
    data: storyCharacters = [],
    isLoading: isStoryCharactersLoading,
  } = useStoryCharacters(storyId);
  const addStoryCharacter = useAddStoryCharacter(storyId);
  const removeStoryCharacter = useRemoveStoryCharacter(storyId);
  const updateStoryCharacterRole = useUpdateStoryCharacterRole(storyId);

  const updateStory = useUpdateStory(storyId);
  const createPanel = useCreatePanel(storyId);
  const updatePanel = useUpdatePanel(storyId);
  const deletePanel = useDeletePanel(storyId);

  // 为章节生成分镜（旧版，保留作为后备）
  const generatePanelsForChapter = useGeneratePanelsForChapter(
    currentChapterId || ""
  );

  // 流式生成 hook
  const { progress, isGenerating, generate, cancel, reset } = useStreamingGeneration();

  // Unified UI state management
  const { state: uiState, actions: uiActions } = useUIState();

  // Sync form with fetched data
  useEffect(() => {
    // 避免覆盖用户正在编辑的内容，仅在进入页面或后端数据变更时同步
    if (!data?.story || uiState.editMode) return;

    uiActions.setStoryForm({
      title: data.story.title,
      premise: data.story.premise || "",
    });
  }, [
    data?.story,
    uiActions,
    uiState.editMode,
  ]);

  // Handle errors with detailed messages
  useEffect(() => {
    if (error) {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  async function handleUpdateStory() {
    try {
      await updateStory.mutateAsync(uiState.storyForm);
      uiActions.setEditMode(false);
      toast({
        title: "剧本已保存",
        description: "所有修改已同步到服务器"
      });
    } catch (error) {
      const errorInfo = formatErrorForToast(error);
      const canRetry = isRetryableError(error);

      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
        action: canRetry ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUpdateStory()}
          >
            重试
          </Button>
        ) : undefined
      });
    }
  }

  async function handleSavePanel(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.projectId) return;

    try {
      const isNew = !uiState.editingPanel?.id;

      if (isNew) {
        await createPanel.mutateAsync({
          ...uiState.editingPanel,
          project_id: data.projectId,
        } as any);
        toast({ title: "分镜已创建" });
      } else {
        await updatePanel.mutateAsync(uiState.editingPanel as any);
        toast({ title: "分镜已更新" });
      }

      uiActions.closePanelDialog();
    } catch (error) {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive"
      });
    }
  }

  async function handleDeletePanel(id: string) {
    uiActions.setDeletingPanel(id);
  }

  async function confirmDeletePanel() {
    if (!uiState.deletingPanelId) return;

    try {
      await deletePanel.mutateAsync(uiState.deletingPanelId);
      toast({ title: "分镜已删除" });
    } catch (error) {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive"
      });
    } finally {
      uiActions.setDeletingPanel(null);
    }
  }

  async function handleImageGenerated(panelId: string, imageUrl: string) {
    await refetchPanels?.();
    toast({ title: "图片生成成功" });
  }

  function handleAddPanel() {
    if (!data?.projectId) return;
    uiActions.openNewPanelDialog(data.projectId);
  }

  // Story character handlers
  async function handleAddCharacter(
    characterId: string,
    role: CharacterRole
  ): Promise<void> {
    try {
      await addStoryCharacter.mutateAsync({ characterId, role });
      toast({ title: "角色已添加到故事" });
    } catch (error) {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
    }
  }

  async function handleRemoveCharacter(characterId: string): Promise<void> {
    try {
      await removeStoryCharacter.mutateAsync(characterId);
      toast({ title: "角色已从故事移除" });
    } catch (error) {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
    }
  }

  async function handleCharacterRoleChange(
    characterId: string,
    role: CharacterRole
  ): Promise<void> {
    try {
      await updateStoryCharacterRole.mutateAsync({ characterId, role });
      toast({ title: "角色类型已更新" });
    } catch (error) {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
    }
  }

  // AI生成分镜（章节级别）- 使用流式 SSE 版本
  async function handleGeneratePanelsForChapter(chapterId: string): Promise<void> {
    if (!data?.story) {
      toast({ title: "故事不存在", variant: "destructive" });
      return;
    }

    try {
      let projectId = data.projectId;

      // 如果 Story 还没有关联 Project，先创建一个
      if (!projectId) {
        const createProjectRes = await fetch("/api/project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.story.title,
            description: data.story.premise || "AI生成的漫画项目",
            story_id: storyId,
            status: "in_progress",
          }),
        });

        if (!createProjectRes.ok) {
          const error = await createProjectRes.json();
          throw new Error(error.error || "创建项目失败");
        }

        const createProjectData = await createProjectRes.json();
        projectId = createProjectData.project.id;

        // 刷新页面数据以获取新的 projectId
        await refetchPanels?.();
      }

      // 使用流式生成
      await generate({
        chapterId,
        projectId: projectId,
        overwrite: false,
      });

      // 生成完成后提示并刷新
      toast({
        title: "分镜生成完成",
        description: "AI 已成功为当前章节生成分镜脚本",
      });
      await refetchPanels?.();
      reset(); // 重置进度状态
    } catch (error) {
      // 只在非取消错误时显示 toast（取消错误已经在 hook 中处理）
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
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold">未找到剧本</h1>
        <Button className="mt-4" onClick={() => router.push("/scripts")}>
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/scripts")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{data.story.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{data.story.genre}</Badge>
              <span>Updated: {format(new Date(data.story.updated_at), "yyyy-MM-dd HH:mm")}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left: Story Info, Characters & Chapters */}
          <div className="lg:col-span-1 space-y-6">
            <StoryInfoPanel
              story={data.story}
              editMode={uiState.editMode}
              storyForm={uiState.storyForm}
              saving={updateStory.isPending}
              onEditModeToggle={() => uiActions.setEditMode(true)}
              onCancel={() => uiActions.setEditMode(false)}
              onSave={handleUpdateStory}
              onAutoSave={async (formData) => {
                // Auto-save using React Query mutation
                await updateStory.mutateAsync(formData);
              }}
              onFormChange={(field, value) =>
                uiActions.updateStoryForm({ [field]: value })
              }
            />

            {/* Chapter List */}
            <ChapterList
              storyId={storyId}
              currentChapterId={currentChapterId}
              onChapterSelect={setCurrentChapterId}
            />

            {/* Story Characters from Library */}
            <StoryCharacterList
              storyId={storyId}
              characters={storyCharacters}
              onAdd={handleAddCharacter}
              onRemove={handleRemoveCharacter}
              onRoleChange={handleCharacterRoleChange}
              isLoading={isStoryCharactersLoading}
            />
          </div>

          {/* Right: Panels & Images Gallery */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="panels" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="panels">分镜列表</TabsTrigger>
                <TabsTrigger value="gallery">生成图库</TabsTrigger>
              </TabsList>

              <TabsContent value="panels">
                {isPanelsLoading ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm text-muted-foreground">加载分镜列表中...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <PanelListView
                    panels={data?.panels || []}
                    projectId={data?.projectId || null}
                    storyId={storyId}
                    currentChapterId={currentChapterId}
                    onGeneratePanelsForChapter={handleGeneratePanelsForChapter}
                    isGeneratingPanels={isGenerating}
                    characters={characterAssets}
                    charactersLoading={isCharactersLoading}
                    onCharactersRefresh={() => { refetchCharacters(); }}
                    onPanelsChange={() => { }}
                    onEditPanel={(panel) => uiActions.openEditPanelDialog(panel)}
                    onDeletePanel={handleDeletePanel}
                    onAddPanel={handleAddPanel}
                    onImageGenerated={handleImageGenerated}
                    onRefresh={() => refetchPanels?.()}
                    onError={(msg) =>
                      toast({ title: "错误", description: msg, variant: "destructive" })
                    }
                  />
                )}
              </TabsContent>

              <TabsContent value="gallery">
                <StoryImagesGallery storyId={storyId} projectId={data?.projectId} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Edit/Create Dialog */}
        <PanelEditDialog
          open={uiState.isDialogOpen}
          panel={uiState.editingPanel}
          characters={data?.story?.characters || []}
          storyId={storyId}
          saving={false}
          onOpenChange={(open) => !open && uiActions.closePanelDialog()}
          onSave={handleSavePanel}
          onChange={uiActions.updatePanelField}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!uiState.deletingPanelId} onOpenChange={(open) => !open && uiActions.setDeletingPanel(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除这个分镜吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePanel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Streaming Generation Progress */}
        <GenerationProgress progress={progress} onCancel={cancel} />
      </div>
    </ErrorBoundary>
  );
}
