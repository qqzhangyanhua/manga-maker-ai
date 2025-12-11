"use client";

import { useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PanelListView } from "./components/PanelListView";
import { PanelEditDialog } from "./components/PanelEditor/PanelEditDialog";
import { StoryDetailsSkeleton } from "./components/StoryDetailsSkeleton";
import type { Story, Panel } from "./types/script-editor.types";
import {
  useUpdateStory,
  useCreatePanel,
  useUpdatePanel,
  useDeletePanel,
} from "./hooks/useStoryData";
import { useStoryDataOptimized } from "./hooks/useStoryDataOptimized";
import { useCharacterAssets } from "./hooks/useCharacterAssets";
import { useUIState } from "./hooks/useUIState";
import { formatErrorForToast, isRetryableError } from "./utils/errorHandling";

export default function ScriptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const storyId = params.id as string;

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
  const updateStory = useUpdateStory(storyId);
  const createPanel = useCreatePanel(storyId);
  const updatePanel = useUpdatePanel(storyId);
  const deletePanel = useDeletePanel(storyId);

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
    data?.story?.id,
    data?.story?.title,
    data?.story?.premise,
    uiActions.setStoryForm,
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

  function handleImageGenerated(panelId: string, imageUrl: string) {
    // React Query will handle the update via cache invalidation
    toast({ title: "图片生成成功" });
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Story Info */}
        <div className="lg:col-span-1">
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
        </div>

        {/* Right: Panels */}
        <div className="lg:col-span-2">
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
              characters={characterAssets}
              charactersLoading={isCharactersLoading}
              onCharactersRefresh={() => refetchCharacters()}
              onPanelsChange={() => { }}
              onEditPanel={(panel) => uiActions.openEditPanelDialog(panel)}
              onDeletePanel={handleDeletePanel}
              onAddPanel={() => uiActions.openNewPanelDialog(data?.projectId || "")}
              onImageGenerated={handleImageGenerated}
              onRefresh={() => refetchPanels?.()}
              onError={(msg) =>
                toast({ title: "错误", description: msg, variant: "destructive" })
              }
            />
          )}
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <PanelEditDialog
        open={uiState.isDialogOpen}
        panel={uiState.editingPanel}
        characters={data?.story?.characters || []}
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
      </div>
    </ErrorBoundary>
  );
}
