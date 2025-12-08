"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ScriptEditorPane from "@/components/Storyboard/ScriptEditorPane";
import EditablePanelCard from "@/components/Storyboard/EditablePanelCard";
import InsertPanelDialog from "@/components/Storyboard/InsertPanelDialog";

// 类型定义
type ScriptSegment = {
  id: string;
  text: string;
  start: number;
  end: number;
};

type Panel = {
  id: string;
  panel_order: number;
  panel_type: string;
  importance: string;
  description: string;
  visual_prompt: string | null;
  dialogue: string | null;
  character_name: string | null;
  emotion: string | null;
  generated_image: string | null;
  prompt_used: string | null;
  script_segment_id: string | null;
  script_start: number | null;
  script_end: number | null;
  camera_angle: string | null;
  shot_size: string | null;
  sketch_image_url: string | null;
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  style: string | null;
  status: string;
  panels: Panel[];
  script: {
    id: string;
    content: string;
    segments: ScriptSegment[];
  } | null;
};

export default function StoryboardEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [insertAfterOrder, setInsertAfterOrder] = useState<number | null>(null);
  const [operationLoading, setOperationLoading] = useState<{
    type: "merge" | "split" | "insert" | null;
    panelId?: string;
  }>({ type: null });

  // Refs for scrolling
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 全局快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + M: 合并
      if ((e.metaKey || e.ctrlKey) && e.key === "m" && selectedPanelId) {
        e.preventDefault();
        handleMerge(selectedPanelId);
      }
      // Cmd/Ctrl + D: 拆分（避免与浏览器书签冲突，改用 D）
      else if ((e.metaKey || e.ctrlKey) && e.key === "d" && selectedPanelId) {
        e.preventDefault();
        handleSplit(selectedPanelId);
      }
      // Cmd/Ctrl + I: 插入
      else if ((e.metaKey || e.ctrlKey) && e.key === "i" && selectedPanelId) {
        e.preventDefault();
        const panel = project?.panels.find((p) => p.id === selectedPanelId);
        if (panel) {
          handleInsertAfter(panel.panel_order);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPanelId, project]);

  // 加载项目数据
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/project/${projectId}`);
        if (!response.ok) {
          throw new Error("加载项目失败");
        }
        const data = await response.json();
        setProject(data);
      } catch (error) {
        console.error("Fetch project error:", error);
        toast({
          title: "加载失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
        router.push("/storyboard");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, router, toast]);

  // 点击文本片段 → 高亮对应分镜
  const handleSegmentClick = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
    const panel = project?.panels.find((p) => p.script_segment_id === segmentId);
    if (panel) {
      setSelectedPanelId(panel.id);
      panelRefs.current[panel.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // 点击分镜 → 高亮对应文本
  const handlePanelClick = (panelId: string) => {
    setSelectedPanelId(panelId);
    const panel = project?.panels.find((p) => p.id === panelId);
    if (panel?.script_segment_id) {
      setSelectedSegmentId(panel.script_segment_id);
      segmentRefs.current[panel.script_segment_id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // 更新分镜
  const handlePanelUpdate = async (panelId: string, updates: Partial<Panel>) => {
    try {
      const response = await fetch(`/api/panel/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("更新失败");
      }

      const { panel: updatedPanel } = await response.json();

      // 更新本地状态
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          panels: prev.panels.map((p) => (p.id === panelId ? { ...p, ...updatedPanel } : p)),
        };
      });

      toast({
        title: "已保存",
        description: "分镜已更新",
      });
    } catch (error) {
      console.error("Update panel error:", error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  };

  // 合并分镜
  const handleMerge = async (panelId: string) => {
    if (!project) return;
    
    const panelIndex = project.panels.findIndex((p) => p.id === panelId);
    if (panelIndex === -1 || panelIndex === project.panels.length - 1) {
      toast({
        title: "无法合并",
        description: "只能合并相邻的分镜，且不能是最后一个分镜",
        variant: "destructive",
      });
      return;
    }

    const nextPanel = project.panels[panelIndex + 1];
    
    setOperationLoading({ type: "merge", panelId });
    try {
      const response = await fetch("/api/panel/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: [panelId, nextPanel.id],
          project_id: project.id,
        }),
      });

      if (!response.ok) {
        throw new Error("合并失败");
      }

      // 重新加载项目
      const projectResponse = await fetch(`/api/project/${project.id}`);
      const data = await projectResponse.json();
      setProject(data);

      toast({
        title: "合并成功",
        description: "两个分镜已合并为一个",
      });
    } catch (error) {
      console.error("Merge error:", error);
      toast({
        title: "合并失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setOperationLoading({ type: null });
    }
  };

  // 拆分分镜
  const handleSplit = async (panelId: string) => {
    setOperationLoading({ type: "split", panelId });
    try {
      const response = await fetch("/api/panel/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_id: panelId,
          split_hint: "根据内容自然拆分为两个连贯的画面",
        }),
      });

      if (!response.ok) {
        throw new Error("拆分失败");
      }

      // 重新加载项目
      if (project) {
        const projectResponse = await fetch(`/api/project/${project.id}`);
        const data = await projectResponse.json();
        setProject(data);
      }

      toast({
        title: "拆分成功",
        description: "分镜已拆分为两个",
      });
    } catch (error) {
      console.error("Split error:", error);
      toast({
        title: "拆分失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setOperationLoading({ type: null });
    }
  };

  // 插入分镜（打开对话框）
  const handleInsertAfter = async (panelOrder: number) => {
    setInsertAfterOrder(panelOrder);
    setInsertDialogOpen(true);
  };

  // 执行插入分镜
  const handleInsertPanel = async (description: string, useLLM: boolean) => {
    if (!project || insertAfterOrder === null) return;

    setOperationLoading({ type: "insert" });
    try {
      const response = await fetch("/api/panel/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          insert_after_order: insertAfterOrder,
          description,
          use_llm: useLLM,
        }),
      });

      if (!response.ok) {
        throw new Error("插入失败");
      }

      // 重新加载项目
      const projectResponse = await fetch(`/api/project/${project.id}`);
      const data = await projectResponse.json();
      setProject(data);

      toast({
        title: "插入成功",
        description: "新分镜已插入",
      });
    } catch (error) {
      console.error("Insert error:", error);
      toast({
        title: "插入失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setOperationLoading({ type: null });
    }
  };

  // 生成草图（占位符）
  const handleGenerateSketch = async (panelId: string) => {
    toast({
      title: "功能开发中",
      description: "草图生成功能将在后续版本中实现",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">项目不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Header Bar */}
      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/storyboard"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Link>
            <h1 className="font-comic text-xl text-foreground">{project.title}</h1>
            <span className="px-2 py-1 rounded text-xs bg-muted text-muted-foreground">
              {project.panels.length} 个分镜
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground hidden lg:block">
              快捷键: ⌘M 合并 · ⌘D 拆分 · ⌘I 插入
            </div>
            <Button variant="comic" size="sm">
              <Save className="w-4 h-4" />
              保存项目
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content: Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Script Editor (40%) */}
        <div className="w-2/5 border-r border-border overflow-y-auto">
          <ScriptEditorPane
            script={project.script}
            selectedSegmentId={selectedSegmentId}
            onSegmentClick={handleSegmentClick}
            segmentRefs={segmentRefs}
          />
        </div>

        {/* Right: Editable Panel Cards (60%) */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {project.panels.map((panel) => (
              <div
                key={panel.id}
                ref={(el) => {
                  panelRefs.current[panel.id] = el;
                }}
              >
                <EditablePanelCard
                  panel={panel}
                  isSelected={selectedPanelId === panel.id}
                  onClick={() => handlePanelClick(panel.id)}
                  onUpdate={(updates) => handlePanelUpdate(panel.id, updates)}
                  onMerge={handleMerge}
                  onSplit={handleSplit}
                  onInsertAfter={handleInsertAfter}
                  onGenerateSketch={handleGenerateSketch}
                  operationLoading={operationLoading}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insert Panel Dialog */}
      <InsertPanelDialog
        open={insertDialogOpen}
        onOpenChange={setInsertDialogOpen}
        onInsert={handleInsertPanel}
        insertAfterOrder={insertAfterOrder}
      />
    </div>
  );
}
