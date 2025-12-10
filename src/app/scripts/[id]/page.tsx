"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { StoryInfoPanel } from "./components/StoryInfoPanel";
import { PanelListView } from "./components/PanelListView";
import { PanelEditDialog } from "./components/PanelEditor/PanelEditDialog";
import type { Story, Panel } from "./types/script-editor.types";

export default function ScriptDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [story, setStory] = useState<Story | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [storyForm, setStoryForm] = useState({ title: "", premise: "" });
  const [editingPanel, setEditingPanel] = useState<Partial<Panel> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchStoryAndPanels(params.id as string);
    }
  }, [params.id]);

  async function fetchStoryAndPanels(id: string) {
    try {
      setLoading(true);
      const [storyRes, panelsRes] = await Promise.all([
        fetch(`/api/story/${id}`),
        fetch(`/api/story/${id}/panels`),
      ]);

      if (!storyRes.ok) throw new Error("Failed to load story");
      const storyData = await storyRes.json();
      setStory(storyData.story);
      setStoryForm({
        title: storyData.story.title,
        premise: storyData.story.premise || "",
      });

      if (panelsRes.ok) {
        const panelsData = await panelsRes.json();
        setPanels(panelsData.panels || []);
        setProjectId(panelsData.projectId);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "加载数据失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStory() {
    if (!story) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/story/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storyForm),
      });
      if (!res.ok) throw new Error("Failed to update");

      setStory({ ...story, ...storyForm });
      setEditMode(false);
      toast({ title: "剧本已保存" });
    } catch (error) {
      toast({ title: "保存失败", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePanel(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;

    try {
      const isNew = !editingPanel?.id;
      const url = isNew ? "/api/panel" : `/api/panel/${editingPanel.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingPanel, project_id: projectId }),
      });

      if (!res.ok) throw new Error("Operation failed");
      const data = await res.json();

      if (isNew) {
        setPanels([...panels, data.panel]);
      } else {
        setPanels(panels.map((p) => (p.id === data.panel.id ? data.panel : p)));
      }

      setIsDialogOpen(false);
      setEditingPanel(null);
      toast({ title: isNew ? "分镜已创建" : "分镜已更新" });
    } catch (error) {
      toast({ title: "操作失败", variant: "destructive" });
    }
  }

  async function handleDeletePanel(id: string) {
    if (!confirm("确定要删除这个分镜吗？")) return;

    try {
      const res = await fetch(`/api/panel/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      setPanels(panels.filter((p) => p.id !== id));
      toast({ title: "分镜已删除" });
    } catch (error) {
      toast({ title: "删除失败", variant: "destructive" });
    }
  }

  function openNewPanelDialog() {
    setEditingPanel({
      project_id: projectId || "",
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
    // 更新对应的 panel 的图片 URL
    setPanels((prevPanels) =>
      prevPanels.map((p) =>
        p.id === panelId ? { ...p, generated_image: imageUrl, image_url: imageUrl } : p
      )
    );
    toast({ title: "图片生成成功" });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!story) {
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
          <h1 className="text-2xl font-bold">{story.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{story.genre}</Badge>
            <span>Updated: {format(new Date(story.updated_at), "yyyy-MM-dd HH:mm")}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Story Info */}
        <div className="lg:col-span-1">
          <StoryInfoPanel
            story={story}
            editMode={editMode}
            storyForm={storyForm}
            saving={saving}
            onEditModeToggle={() => setEditMode(true)}
            onCancel={() => setEditMode(false)}
            onSave={handleUpdateStory}
            onFormChange={(field, value) =>
              setStoryForm({ ...storyForm, [field]: value })
            }
          />
        </div>

        {/* Right: Panels */}
        <div className="lg:col-span-2">
          <PanelListView
            panels={panels}
            projectId={projectId}
            onPanelsChange={setPanels}
            onEditPanel={openEditPanelDialog}
            onDeletePanel={handleDeletePanel}
            onAddPanel={openNewPanelDialog}
            onImageGenerated={handleImageGenerated}
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
        characters={story?.characters || []}
        saving={false}
        onOpenChange={setIsDialogOpen}
        onSave={handleSavePanel}
        onChange={handlePanelFieldChange}
      />
    </div>
  );
}
