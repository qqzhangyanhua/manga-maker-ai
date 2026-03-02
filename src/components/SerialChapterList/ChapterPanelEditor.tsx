/**
 * 章节内联分镜编辑器
 * 完整的分镜编辑功能，包含拖拽排序、拆分、合并、插入、多镜生成
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus, ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { SortableInlineEditablePanelCard } from "@/app/scripts/[id]/components/PanelEditor/SortableInlineEditablePanelCard";
import { usePanelInlineUpdate } from "@/app/scripts/[id]/hooks/usePanelInlineUpdate";
import { PanelCardActions } from "@/app/scripts/[id]/components/PanelEditor/PanelCardActions";
import { InsertPanelDialog } from "@/app/scripts/[id]/components/PanelEditor/InsertPanelDialog";
import { SplitPanelDialog } from "@/app/scripts/[id]/components/PanelEditor/SplitPanelDialog";
import { ReferenceGuidedGenerationDialog } from "@/app/scripts/[id]/components/PanelEditor/ReferenceGuidedGenerationDialog";
import { MultiPanelGenerateDialog } from "@/app/scripts/[id]/components/MultiPanelGenerateDialog";
import { CandidateSelector } from "@/components/common/CandidateSelector";
import { useCandidateSystem } from "@/hooks/useCandidateSystem";
import { useToast } from "@/hooks/use-toast";
import type { Panel } from "./types";
import type { CharacterReference } from "@/app/scripts/[id]/types/character.types";
import type { Panel as ScriptPanel } from "@/app/scripts/[id]/types/script-editor.types";

interface ChapterPanelEditorProps {
  chapterId: string;
  panels: Panel[];
  projectId: string | null;
  storyId: string;
  characters: CharacterReference[];
  charactersLoading?: boolean;
  isGeneratingPanels?: boolean;
  streamingPanels?: Panel[];
  onGeneratePanels: () => void;
  onDeletePanel: (panelId: string) => Promise<void>;
  onImageGenerated: (panelId: string, imageUrl: string) => Promise<void>;
  onCharactersRefresh?: () => void;
  onRefresh: () => Promise<void> | void;
  onError: (message: string) => void;
}

export function ChapterPanelEditor({
  chapterId,
  panels,
  projectId,
  storyId,
  characters,
  charactersLoading = false,
  isGeneratingPanels = false,
  streamingPanels = [],
  onGeneratePanels,
  onDeletePanel,
  onImageGenerated,
  onCharactersRefresh,
  onRefresh,
  onError,
}: ChapterPanelEditorProps) {
  const { toast } = useToast();

  // Inline editing hook
  const { updatePanelField } = usePanelInlineUpdate();

  // Handler for inline panel updates
  const handlePanelUpdate = useCallback(
    async (panelId: string, field: string, value: string) => {
      await updatePanelField(panelId, field, value);
    },
    [updatePanelField]
  );

  // 过滤当前章节的分镜
  const chapterPanels = useMemo(() => {
    return panels
      .filter((p) => p.chapter_id === chapterId)
      .sort((a, b) => (a.panel_order || 0) - (b.panel_order || 0));
  }, [panels, chapterId]);

  // 合并已保存的分镜和临时生成中的分镜
  const displayPanels = useMemo(() => {
    const tempPanels: Panel[] = streamingPanels.map((panel) => ({
      ...panel,
      id: `temp-${panel.panel_order}`,
      project_id: projectId || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    return [...chapterPanels, ...tempPanels].sort(
      (a, b) => (a.panel_order || 0) - (b.panel_order || 0)
    );
  }, [chapterPanels, streamingPanels, projectId]);

  // 状态
  const [isDragging, setIsDragging] = useState(false);
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState(0);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitPanel, setSplitPanel] = useState<Panel | null>(null);
  const [mergingPanels, setMergingPanels] = useState<{
    current: Panel;
    next: Panel;
  } | null>(null);
  const [multiPanelDialogOpen, setMultiPanelDialogOpen] = useState(false);
  const [referenceDialogOpen, setReferenceDialogOpen] = useState(false);
  const [selectedPanelForGeneration, setSelectedPanelForGeneration] =
    useState<Panel | null>(null);

  // 候选图系统
  const [variantPanelId, setVariantPanelId] = useState<string | null>(null);
  const candidateSystem = useCandidateSystem({
    panelId: variantPanelId || "",
    onConfirm: onImageGenerated,
  });

  const handleGenerateVariants = useCallback(
    (panel: Panel) => {
      setVariantPanelId(panel.id);
      const imageUrl = panel.generated_image || panel.image_url;
      candidateSystem.clearCandidates();
      void candidateSystem.generateCandidates(
        panel.description || "",
        3,
        imageUrl
      );
    },
    [candidateSystem]
  );

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // 拖拽开始
  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  // 拖拽结束
  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = chapterPanels.findIndex((p) => p.id === active.id);
    const newIndex = chapterPanels.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newPanels = arrayMove(chapterPanels, oldIndex, newIndex);
    const updates = newPanels.map((panel, index) => ({
      id: panel.id,
      panel_order: index + 1,
    }));

    try {
      const response = await fetch("/api/panel/batch-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates, projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "更新顺序失败");
      }

      await onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : "更新顺序失败");
    }
  };

  // 生成单个分镜图片
  const handleGenerateSingle = (panel: Panel) => {
    setSelectedPanelForGeneration(panel);
    setReferenceDialogOpen(true);
  };

  // 在指定分镜之后插入
  const handleInsertAfter = (panel: Panel) => {
    setInsertAfterIndex(panel.panel_order || 0);
    setInsertDialogOpen(true);
  };

  // 拆分分镜
  const handleSplit = (panel: Panel) => {
    setSplitPanel(panel);
    setSplitDialogOpen(true);
  };

  // 与下一镜合并
  const handleMergeWithNext = (panel: Panel) => {
    const currentIndex = chapterPanels.findIndex((p) => p.id === panel.id);
    if (currentIndex === -1 || currentIndex === chapterPanels.length - 1) {
      onError("无法合并：这是最后一个分镜");
      return;
    }

    const nextPanel = chapterPanels[currentIndex + 1];
    setMergingPanels({ current: panel, next: nextPanel });
  };

  // 确认合并
  const confirmMerge = async () => {
    if (!mergingPanels) return;

    try {
      const response = await fetch("/api/panel/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: [mergingPanels.current.id, mergingPanels.next.id],
          project_id: projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "合并分镜失败");
      }

      await onRefresh();
      toast({ title: "合并成功" });
    } catch (error) {
      onError(error instanceof Error ? error.message : "合并分镜失败");
    } finally {
      setMergingPanels(null);
    }
  };

  // 操作完成回调
  const handleOperationComplete = () => {
    void onRefresh();
  };

  // 生成图片成功回调
  const handleReferenceGenerated = (panelId: string, imageUrl: string) => {
    void onImageGenerated(panelId, imageUrl);
    void onRefresh();
  };

  if (chapterPanels.length === 0 && !isGeneratingPanels) {
    return (
      <div className="text-center py-8 bg-gray-900/30 rounded-lg border border-dashed border-gray-700">
        <ImageIcon className="w-10 h-10 mx-auto text-gray-500 mb-3" />
        <p className="text-gray-400 mb-3">暂无分镜</p>
        <Button
          size="sm"
          onClick={onGeneratePanels}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          AI 生成分镜
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          共 {chapterPanels.length} 个分镜
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMultiPanelDialogOpen(true)}
            disabled={chapterPanels.length === 0}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            多镜生成
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onGeneratePanels}
            disabled={isGeneratingPanels}
            className="border-gray-700"
          >
            {isGeneratingPanels ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            {chapterPanels.length === 0 ? "生成分镜" : "追加分镜"}
          </Button>
        </div>
      </div>

      {/* 分镜列表 */}
      <TooltipProvider>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayPanels.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {displayPanels.map((panel, index) => (
                <div key={panel.id}>
                  <SortableInlineEditablePanelCard
                    panel={panel as ScriptPanel}
                    index={index}
                    onPanelUpdate={handlePanelUpdate}
                    actions={
                      <PanelCardActions
                        panel={panel as ScriptPanel}
                        onEdit={() => {}}
                        onDelete={() => onDeletePanel(panel.id)}
                        onGenerate={() => handleGenerateSingle(panel)}
                        onGenerateVariants={
                          (panel.generated_image || panel.image_url)
                            ? () => handleGenerateVariants(panel)
                            : undefined
                        }
                        onInsertAfter={() => handleInsertAfter(panel)}
                        onSplit={() => handleSplit(panel)}
                        onMergeWithNext={() => handleMergeWithNext(panel)}
                        onShareSuccess={handleOperationComplete}
                      />
                    }
                  />
                  {variantPanelId === panel.id && (
                    <div className="ml-10 mt-2 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                      <CandidateSelector
                        candidates={candidateSystem.candidates}
                        currentImageUrl={panel.generated_image || panel.image_url}
                        isGenerating={candidateSystem.isGenerating}
                        onSelect={candidateSystem.selectCandidate}
                        onUndo={candidateSystem.undo}
                        canUndo={candidateSystem.canUndo}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SortableContext>

          {isDragging && (
            <div className="fixed inset-0 bg-background/50 pointer-events-none z-40" />
          )}
        </DndContext>
      </TooltipProvider>

      {/* 对话框 */}
      {projectId && (
        <>
          <InsertPanelDialog
            open={insertDialogOpen}
            projectId={projectId}
            insertAfterIndex={insertAfterIndex}
            onOpenChange={setInsertDialogOpen}
            onInserted={handleOperationComplete}
            onError={onError}
          />
          <SplitPanelDialog
            open={splitDialogOpen}
            panel={splitPanel as ScriptPanel}
            onOpenChange={setSplitDialogOpen}
            onSplit={handleOperationComplete}
            onError={onError}
          />
        </>
      )}

      {/* 合并确认对话框 */}
      <AlertDialog
        open={!!mergingPanels}
        onOpenChange={(open) => !open && setMergingPanels(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认合并分镜</AlertDialogTitle>
            <AlertDialogDescription>
              {mergingPanels && (
                <>
                  确定要合并分镜{" "}
                  <strong>#{mergingPanels.current.panel_order}</strong> 和{" "}
                  <strong>#{mergingPanels.next.panel_order}</strong> 吗？
                  <br />
                  合并后将保留第一个分镜的内容，第二个分镜将被删除。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMerge}>
              确认合并
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 多镜生成对话框 */}
      <MultiPanelGenerateDialog
        open={multiPanelDialogOpen}
        panels={chapterPanels as ScriptPanel[]}
        storyId={storyId}
        projectId={projectId}
        onOpenChange={setMultiPanelDialogOpen}
        onSuccess={() => {
          void onRefresh();
        }}
      />

      {/* 参考图片辅助生成对话框 */}
      <ReferenceGuidedGenerationDialog
        open={referenceDialogOpen}
        panel={selectedPanelForGeneration as ScriptPanel}
        allPanels={chapterPanels as ScriptPanel[]}
        storyId={storyId}
        characters={characters}
        onCharactersRefresh={onCharactersRefresh}
        onOpenChange={setReferenceDialogOpen}
        onGenerated={handleReferenceGenerated}
      />
    </div>
  );
}
