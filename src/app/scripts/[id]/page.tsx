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

export default function ScriptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const storyId = params.id as string;
  const { execute } = useStoryOperation();

  // Dialog states
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [pendingChapterId, setPendingChapterId] = useState<string | null>(null);
  const [createChapterDialogOpen, setCreateChapterDialogOpen] = useState(false);
  const [generateNextChapterDialogOpen, setGenerateNextChapterDialogOpen] = useState(false);

  // Data fetching hooks
  const { data, isLoading, isPanelsLoading, error, refetchPanels, refetchStory } = useStoryDataOptimized(storyId);
  const { data: characterAssets = [], isLoading: isCharactersLoading, refetch: refetchCharacters } = useCharacterAssets();
  const refreshStoryData = useCallback(async () => {`r`n    await Promise.all([refetchStory(), refetchPanels()]);`r`n  }, [refetchStory, refetchPanels]);
  
  const { data: storyCharacters = [], isLoading: isStoryCharactersLoading, refetch: refetchStoryCharacters } = useStoryCharacters(storyId);

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
    // 閬垮厤瑕嗙洊鐢ㄦ埛姝ｅ湪缂栬緫鐨勫唴瀹癸紝浠呭湪杩涘叆椤甸潰鎴栧悗绔暟鎹彉鏇存椂鍚屾
    if (!data?.story || uiState.editMode) return;

    uiActions.setStoryForm({
      title: data.story.title,
      premise: data.story.premise || "",
      comic_style_id: data.story.comic_style_id || null,
      style_reference_image: data.story.style_reference_image || null,
    });
  }, [
    data?.story,
    uiActions,
    uiState.editMode,
  ]);

  // Error handling
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

  // Event handlers using unified error handling
  async function handleUpdateStory() {
    const operation = await execute(
      async () => {
        await updateStory.mutateAsync(uiState.storyForm);
        uiActions.setEditMode(false);
      },
      { successMessage: "鍓ф湰宸蹭繚瀛? }
    );
    await operation();
  }

  async function handleImageGenerated(_panelId: string, _imageUrl: string) {
    await refetchPanels?.();
    toast({ title: "鍥剧墖鐢熸垚鎴愬姛" });
  }

  async function handleDeletePanel(panelId: string): Promise<void> {
    const operation = await execute(
      async () => {
        const response = await fetch(`/api/panel/${panelId}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "鍒犻櫎鍒嗛暅澶辫触");
        }
        await refetchPanels?.();
      },
      { successMessage: "鍒嗛暅宸插垹闄? }
    );
    await operation();
  }

  async function handleAddCharacter(characterId: string, role: CharacterRole): Promise<void> {
    const operation = await execute(
      async () => {
        await addStoryCharacter.mutateAsync({ characterId, role });
      },
      { successMessage: "瑙掕壊宸叉坊鍔犲埌鏁呬簨" }
    );
    await operation();
  }

  async function handleRemoveCharacter(characterId: string): Promise<void> {
    const operation = await execute(
      async () => {
        await removeStoryCharacter.mutateAsync(characterId);
      },
      { successMessage: "瑙掕壊宸蹭粠鏁呬簨绉婚櫎" }
    );
    await operation();
  }

  async function handleCharacterRoleChange(characterId: string, role: CharacterRole): Promise<void> {
    const operation = await execute(
      async () => {
        await updateStoryCharacterRole.mutateAsync({ characterId, role });
      },
      { successMessage: "瑙掕壊绫诲瀷宸叉洿鏂? }
    );
    await operation();
  }

  async function handleGeneratePanelsForChapter(chapterId: string): Promise<void> {
    if (!data?.story) {
      toast({ title: "鏁呬簨涓嶅瓨鍦?, variant: "destructive" });
      return;
    }
    setPendingChapterId(chapterId);
    setGenerateDialogOpen(true);
  }

  async function executeGeneration(
    chapterId: string,
    mode: "overwrite" | "append",
    panelCount?: number
  ): Promise<void> {
    if (!data?.story) {
      toast({ title: "鏁呬簨涓嶅瓨鍦?, variant: "destructive" });
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
            description: data.story.premise || "AI鐢熸垚鐨勬极鐢婚」鐩?,
            story_id: storyId,
            status: "in_progress",
          }),
        });

        if (!createProjectRes.ok) {
          const error = await createProjectRes.json();
          throw new Error(error.error || "鍒涘缓椤圭洰澶辫触");
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
        title: "鍒嗛暅鐢熸垚瀹屾垚",
        description: mode === "overwrite"
          ? "AI 宸叉垚鍔熼噸鏂扮敓鎴愬垎闀滆剼鏈?
          : "AI 宸叉垚鍔熻拷鍔犳柊鐨勫垎闀滆剼鏈?,
      });
      await refetchPanels?.();
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
            <h1 className="text-2xl font-bold text-white mb-4">鏈壘鍒板墽鏈?/h1>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white border-0"
              onClick={() => router.push("/scripts")}
            >
              杩斿洖鍒楄〃
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
                  <Tabs defaultValue="panels" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="panels">鍒嗛暅鍒楄〃</TabsTrigger>
                      <TabsTrigger value="gallery">鐢熸垚鍥惧簱</TabsTrigger>
                      <TabsTrigger value="serial">杩炶浇绠＄悊</TabsTrigger>
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
                          toast({ title: "閿欒", description: msg, variant: "destructive" })
                        }
                        onClearChapterFilter={() => setCurrentChapterId(null)}
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
                        onCreateChapter={() => setCreateChapterDialogOpen(true)}
                        onGenerateNext={() => setGenerateNextChapterDialogOpen(true)}
                        onGeneratePanels={(chapterId) => {
                          setCurrentChapterId(chapterId);
                          handleGeneratePanelsForChapter(chapterId);
                        }}
                        onViewPanels={(chapterId) => {
                          setCurrentChapterId(chapterId);
                          // 鍒囨崲鍒板垎闀滃垪琛?Tab
                          const tabsList = document.querySelector('[role="tablist"]');
                          const panelsTab = tabsList?.querySelector('[value="panels"]') as HTMLElement;
                          panelsTab?.click();
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <GenerationProgress progress={progress} onCancel={cancel} />

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

              <CreateChapterDialog
                open={createChapterDialogOpen}
                onOpenChange={setCreateChapterDialogOpen}
                storyId={storyId}
                nextChapterOrder={
                  (data.chapters || []).length > 0
                    ? Math.max(...(data.chapters || []).map(ch => ch.chapter_order)) + 1
                    : 1
                }
                onSuccess={() => { void refreshStoryData(); }}
              />

              <CreateChapterDialog
                open={generateNextChapterDialogOpen}
                onOpenChange={setGenerateNextChapterDialogOpen}
                storyId={storyId}
                nextChapterOrder={
                  (data.chapters || []).length > 0
                    ? Math.max(...(data.chapters || []).map(ch => ch.chapter_order)) + 1
                    : 1
                }
                onSuccess={() => { void refreshStoryData(); }}
              />
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}








