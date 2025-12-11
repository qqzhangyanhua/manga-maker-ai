"use client";

import { useEffect, useState, useCallback } from "react";
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
import { StoryInfoPanel } from "./components/StoryInfoPanel";
import { PanelListView } from "./components/PanelListView";
import { PanelEditDialog } from "./components/PanelEditor/PanelEditDialog";
import type { Story, Panel } from "./types/script-editor.types";
import {
  useStoryData,
  useUpdateStory,
  useCreatePanel,
  useUpdatePanel,
  useDeletePanel,
} from "./hooks/useStoryData";

export default function ScriptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const storyId = params.id as string;

  // React Query hooks for data management
  const { data, isLoading, error } = useStoryData(storyId);
  const updateStory = useUpdateStory(storyId);
  const createPanel = useCreatePanel(storyId);
  const updatePanel = useUpdatePanel(storyId);
  const deletePanel = useDeletePanel(storyId);

  // Local UI state
  const [editMode, setEditMode] = useState(false);
  const [storyForm, setStoryForm] = useState({ title: "", premise: "" });
  const [editingPanel, setEditingPanel] = useState<Partial<Panel> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingPanelId, setDeletingPanelId] = useState<string | null>(null);

  // Sync form with fetched data
  useEffect(() => {
    if (data?.story) {
      setStoryForm({
        title: data.story.title,
        premise: data.story.premise || "",
      });
    }
  }, [data?.story]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({ title: "Error", description: "加载数据失败", variant: "destructive" });
    }
  }, [error, toast]);

  async function handleUpdateStory() {
    try {
      await updateStory.mutateAsync(storyForm);
      setEditMode(false);
      toast({ title: "剧本已保存" });
    } catch (error) {
      toast({ title: "保存失败", variant: "destructive" });
    }
  }

  async function handleSavePanel(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.projectId) return;

    try {
      const isNew = !editingPanel?.id;

      if (isNew) {
        await createPanel.mutateAsync({
          ...editingPanel,
          project_id: data.projectId,
        } as any);
        toast({ title: "分镜已创建" });
      } else {
        await updatePanel.mutateAsync(editingPanel as any);
        toast({ title: "分镜已更新" });
      }

      setIsDialogOpen(false);
      setEditingPanel(null);
    } catch (error) {
      toast({ title: "操作失败", variant: "destructive" });
    }
  }

  async function handleDeletePanel(id: string) {
    setDeletingPanelId(id);
  }

  async function confirmDeletePanel() {
    if (!deletingPanelId) return;

    try {
      await deletePanel.mutateAsync(deletingPanelId);
      toast({ title: "分镜已删除" });
    } catch (error) {
      toast({ title: "删除失败", variant: "destructive" });
    } finally {
      setDeletingPanelId(null);
    }
  }

  function openNewPanelDialog() {
    setEditingPanel({
      project_id: data?.projectId || "",
      description: "",
      panel_type: "medium",
      importance: "medium",
      camera_angle: "eye_level",
      shot_size: "medium_shot",
      dialogue: "",
      character_name: "",
      emotion: "",
      visual_prompt: "",
    });
    setIsDialogOpen(true);
  }

  function openEditPanelDialog(panel: Panel) {
    setEditingPanel({ ...panel });
    setIsDialogOpen(true);
  }

  function handlePanelFieldChange(field: string, value: string) {
    setEditingPanel((prev) => prev ? { ...prev, [field]: value } : null);
  }

  function handleImageGenerated(panelId: string, imageUrl: string) {
    // React Query will handle the update via cache invalidation
    toast({ title: "图片生成成功" });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
            editMode={editMode}
            storyForm={storyForm}
            saving={updateStory.isPending}
            onEditModeToggle={() => setEditMode(true)}
            onCancel={() => setEditMode(false)}
            onSave={handleUpdateStory}
            onAutoSave={async (formData) => {
              // Auto-save using React Query mutation
              await updateStory.mutateAsync(formData);
            }}
            onFormChange={(field, value) =>
              setStoryForm({ ...storyForm, [field]: value })
            }
          />
        </div>

        {/* Right: Panels */}
        <div className="lg:col-span-2">
          <PanelListView
            panels={data.panels}
            projectId={data.projectId}
            onPanelsChange={() => { }}
            onEditPanel={openEditPanelDialog}
            onDeletePanel={handleDeletePanel}
            onAddPanel={openNewPanelDialog}
            onImageGenerated={handleImageGenerated}
            onRefresh={() => {
              // Trigger React Query to refetch data
              // This will be handled automatically by mutations
            }}
            onError={(msg) =>
              toast({ title: "错误", description: msg, variant: "destructive" })
            }
          />
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <PanelEditDialog
        open={isDialogOpen}
        panel={editingPanel}
        characters={data.story?.characters || []}
        saving={false}
        onOpenChange={setIsDialogOpen}
        onSave={handleSavePanel}
        onChange={handlePanelFieldChange}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPanelId} onOpenChange={(open) => !open && setDeletingPanelId(null)}>
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
  );
}
