"use client";

import { useState, useRef, use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScriptEditorPane from "@/components/Storyboard/ScriptEditorPane";
import PanelPane from "@/components/Storyboard/PanelPane";
import InsertPanelDialog from "@/components/Storyboard/InsertPanelDialog";
import { useStoryboardData } from "@/hooks/use-storyboard-data";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export default function StoryboardEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;

  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [insertAfterOrder, setInsertAfterOrder] = useState<number | null>(null);

  // Refs for scrolling
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 使用自定义 Hook 管理数据和操作
  const {
    project,
    loading,
    operationLoading,
    handlePanelUpdate,
    handleMerge,
    handleSplit,
    handleInsertPanel,
    handleGenerateSketch,
  } = useStoryboardData(projectId);

  // 插入分镜（打开对话框）
  const handleInsertAfter = async (panelOrder: number) => {
    setInsertAfterOrder(panelOrder);
    setInsertDialogOpen(true);
  };

  // 执行插入操作
  const handleInsertPanelSubmit = async (description: string, useLLM: boolean) => {
    await handleInsertPanel(description, useLLM, insertAfterOrder);
  };

  // 全局快捷键
  useKeyboardShortcuts({
    selectedPanelId,
    project,
    onMerge: handleMerge,
    onSplit: handleSplit,
    onInsertAfter: handleInsertAfter,
  });

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
        <PanelPane
          panels={project.panels}
          selectedPanelId={selectedPanelId}
          panelRefs={panelRefs}
          onPanelClick={handlePanelClick}
          onPanelUpdate={handlePanelUpdate}
          onMerge={handleMerge}
          onSplit={handleSplit}
          onInsertAfter={handleInsertAfter}
          onGenerateSketch={handleGenerateSketch}
          operationLoading={operationLoading}
        />
      </div>

      {/* Insert Panel Dialog */}
      <InsertPanelDialog
        open={insertDialogOpen}
        onOpenChange={setInsertDialogOpen}
        onInsert={handleInsertPanelSubmit}
        insertAfterOrder={insertAfterOrder}
      />
    </div>
  );
}
