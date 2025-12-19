"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Landing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StoryInfoPanel } from "./components/StoryInfoPanel";
import { ChapterList } from "./components/ChapterList";
import { PanelListView } from "./components/PanelListView";
import { StoryDetailsSkeleton } from "./components/StoryDetailsSkeleton";
import { StoryImagesGallery } from "./components/StoryImagesGallery";
import type { Story, Panel } from "./types/script-editor.types";
import { useUpdateStory } from "./hooks/useStoryData";
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
import { GeneratePanelsDialog } from "./components/GeneratePanelsDialog";

export default function ScriptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const storyId = params.id as string;

  // 当前章节状态
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);

  // AI生成分镜对话框状态
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [pendingChapterId, setPendingChapterId] = useState<string | null>(null);

  // Spotlight effect state
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for spotlight effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setMousePosition(null);
  }, []);

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
    refetch: refetchStoryCharacters,
  } = useStoryCharacters(storyId);
  const addStoryCharacter = useAddStoryCharacter(storyId);
  const removeStoryCharacter = useRemoveStoryCharacter(storyId);
  const updateStoryCharacterRole = useUpdateStoryCharacterRole(storyId);

  const updateStory = useUpdateStory(storyId);

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

  async function handleImageGenerated(_panelId: string, _imageUrl: string) {
    await refetchPanels?.();
    toast({ title: "图片生成成功" });
  }

  async function handleDeletePanel(panelId: string): Promise<void> {
    try {
      const response = await fetch(`/api/panel/${panelId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "删除分镜失败");
      }

      toast({ title: "分镜已删除" });
      await refetchPanels?.();
    } catch (error) {
      const errorInfo = formatErrorForToast(error);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
    }
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

    // 无论是否有分镜，都显示对话框（对话框会根据现有分镜数量调整选项）
    setPendingChapterId(chapterId);
    setGenerateDialogOpen(true);
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
        overwrite: mode === "overwrite",
        panelCount,
      });

      // 生成完成后提示并刷新
      toast({
        title: "分镜生成完成",
        description: mode === "overwrite"
          ? "AI 已成功重新生成分镜脚本"
          : "AI 已成功追加新的分镜脚本",
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
      <div className="min-h-screen bg-[#0f0f13]">
        <Navbar />
        <main className="pt-16">
          <div className="container py-12 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">未找到剧本</h1>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white border-0"
              onClick={() => router.push("/scripts")}
            >
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
          {/* 装饰性光晕 */}
          <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
          <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/3 blur-3xl rounded-full pointer-events-none" />

          <div
            ref={containerRef}
            className="relative px-4 py-12"
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Global Spotlight Overlay */}
            <div
              className={cn(
                "pointer-events-none absolute inset-0 z-30 transition-opacity duration-500",
                isHovering ? "opacity-100" : "opacity-0"
              )}
              style={{
                background: mousePosition
                  ? `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(249, 115, 22, 0.08), transparent 40%)`
                  : "none",
              }}
            />

            <div className="max-w-7xl mx-auto relative space-y-8">
              {/* Header */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/scripts")}
                  className="text-zinc-400 hover:text-orange-500 hover:bg-zinc-800/50"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent">
                    {data.story.title}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mt-2">
                    <Badge
                      variant="secondary"
                      className="bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    >
                      {data.story.genre}
                    </Badge>
                    <span>
                      更新于: {format(new Date(data.story.updated_at), "yyyy-MM-dd HH:mm")}
                    </span>
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
              onRefresh={() => refetchStoryCharacters()}
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
                    streamingPanels={progress.generatedPanels || []}
                    characters={characterAssets}
                    charactersLoading={isCharactersLoading}
                    onCharactersRefresh={() => { refetchCharacters(); }}
                    onPanelsChange={() => { }}
                    onDeletePanel={handleDeletePanel}
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

              {/* Streaming Generation Progress */}
              <GenerationProgress progress={progress} onCancel={cancel} />

              {/* AI生成分镜对话框 */}
              <GeneratePanelsDialog
                open={generateDialogOpen}
                existingPanelCount={
                  pendingChapterId
                    ? (data?.panels || []).filter(p => p.chapter_id === pendingChapterId).length
                    : 0
                }
                onOpenChange={setGenerateDialogOpen}
                onConfirm={(mode, panelCount) => {
                  if (pendingChapterId) {
                    executeGeneration(pendingChapterId, mode, panelCount);
                  }
                }}
              />
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
