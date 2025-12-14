"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { ArrowLeft, Save, Loader2, Grid, CheckSquare, Sparkles, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScriptEditorPane from "@/components/Storyboard/ScriptEditorPane";
import PanelPane from "@/components/Storyboard/PanelPane";
import InsertPanelDialog from "@/components/Storyboard/InsertPanelDialog";
import BatchOperationToolbar from "@/components/Storyboard/BatchOperationToolbar";
import BatchCameraDialog, {
  type BatchCameraUpdates,
} from "@/components/Storyboard/BatchCameraDialog";
import BatchDeleteDialog from "@/components/Storyboard/BatchDeleteDialog";
import BatchStyleDialog, {
  type BatchStyleUpdates,
} from "@/components/Storyboard/BatchStyleDialog";
import BatchCharacterDialog, {
  type BatchCharacterUpdates,
} from "@/components/Storyboard/BatchCharacterDialog";
import BatchGenerateDialog from "@/components/Storyboard/BatchGenerateDialog";
import ContinuationSuggestionDialog from "@/components/Storyboard/ContinuationSuggestionDialog";
import OptimizationSuggestionDialog from "@/components/Storyboard/OptimizationSuggestionDialog";
import { useStoryboardData } from "@/hooks/use-storyboard-data";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useBatchSelection } from "@/hooks/use-batch-selection";
import { useBatchOperations } from "@/hooks/use-batch-operations";
import { useToast } from "@/hooks/use-toast";

export default function StoryboardEditorPage({
  params,
}: {
  params: { projectId: string };
}) {
  const projectId = params.projectId;
  const { toast } = useToast();

  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [insertAfterOrder, setInsertAfterOrder] = useState<number | null>(null);
  const [panelSelections, setPanelSelections] = useState<Record<string, { characterId?: string; styleKey?: string }>>({});

  // 批量操作弹窗状态
  const [batchCameraDialogOpen, setBatchCameraDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchStyleDialogOpen, setBatchStyleDialogOpen] = useState(false);
  const [batchCharacterDialogOpen, setBatchCharacterDialogOpen] = useState(false);
  const [batchGenerateDialogOpen, setBatchGenerateDialogOpen] = useState(false);

  // AI 建议弹窗状态
  const [continuationDialogOpen, setContinuationDialogOpen] = useState(false);
  const [optimizationDialogOpen, setOptimizationDialogOpen] = useState(false);
  const [optimizationPanelId, setOptimizationPanelId] = useState<string | null>(null);

  // Refs for scrolling
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 批量选择 Hook
  const batchSelection = useBatchSelection();

  // 批量操作 Hook
  const {
    batchUpdateCamera,
    batchUpdateStyle,
    batchUpdateCharacter,
    batchDeletePanels,
    operationLoading: batchOperationLoading,
  } = useBatchOperations();

  // 使用自定义 Hook 管理数据和操作
  const {
    project,
    loading,
    operationLoading,
    characters,
    styles,
    handlePanelUpdate,
    handleMerge,
    handleSplit,
    handleInsertPanel,
    handleGenerateSketch,
    handleGeneratePrompt,
    refetch,
  } = useStoryboardData(projectId);

  // 获取所有分镜ID数组（用于范围选择）
  const allPanelIds = useMemo(
    () => project?.panels.map((p) => p.id) || [],
    [project?.panels]
  );

  // Shift+点击范围选择
  const handleShiftBatchSelect = useCallback(
    (targetId: string) => {
      if (batchSelection.lastSelectedId) {
        batchSelection.selectRange(
          batchSelection.lastSelectedId,
          targetId,
          allPanelIds
        );
      } else {
        batchSelection.toggleSelection(targetId);
      }
    },
    [batchSelection, allPanelIds]
  );

  // 插入分镜（打开对话框）
  const handleInsertAfter = async (panelOrder: number) => {
    setInsertAfterOrder(panelOrder);
    setInsertDialogOpen(true);
  };

  // 执行插入操作
  const handleInsertPanelSubmit = async (description: string, useLLM: boolean) => {
    await handleInsertPanel(description, useLLM, insertAfterOrder);
  };

  const handleSelectionChange = (panelId: string, selection: { characterId?: string; styleKey?: string }) => {
    setPanelSelections((prev) => ({ ...prev, [panelId]: selection }));
  };

  // 批量角色替换 - 打开弹窗
  const handleBatchCharacter = useCallback(() => {
    setBatchCharacterDialogOpen(true);
  }, []);

  // 批量角色替换确认回调
  const handleBatchCharacterConfirm = useCallback(
    async (updates: BatchCharacterUpdates) => {
      const selectedIds = batchSelection.getSelectedIds();
      const success = await batchUpdateCharacter(selectedIds, updates);
      if (success) {
        // 刷新数据
        refetch?.();
        // 退出多选模式
        batchSelection.exitSelectionMode();
      }
    },
    [batchSelection, batchUpdateCharacter, refetch]
  );

  // 批量风格调整 - 打开弹窗
  const handleBatchStyle = useCallback(() => {
    setBatchStyleDialogOpen(true);
  }, []);

  // 批量风格调整确认回调
  const handleBatchStyleConfirm = useCallback(
    async (updates: BatchStyleUpdates) => {
      const selectedIds = batchSelection.getSelectedIds();
      const success = await batchUpdateStyle(selectedIds, updates);
      if (success) {
        // 刷新数据
        refetch?.();
        // 退出多选模式
        batchSelection.exitSelectionMode();
      }
    },
    [batchSelection, batchUpdateStyle, refetch]
  );

  // 批量镜头调整 - 打开弹窗
  const handleBatchCamera = useCallback(() => {
    setBatchCameraDialogOpen(true);
  }, []);

  // 批量镜头调整确认回调
  const handleBatchCameraConfirm = useCallback(
    async (updates: BatchCameraUpdates) => {
      const selectedIds = batchSelection.getSelectedIds();
      const success = await batchUpdateCamera(selectedIds, updates);
      if (success) {
        // 刷新数据
        refetch?.();
        // 退出多选模式
        batchSelection.exitSelectionMode();
      }
    },
    [batchSelection, batchUpdateCamera, refetch]
  );

  // 批量生成 - 打开弹窗
  const handleBatchGenerate = useCallback(() => {
    setBatchGenerateDialogOpen(true);
  }, []);

  // 批量生成完成回调
  const handleBatchGenerateComplete = useCallback(() => {
    // 刷新数据
    refetch?.();
    // 退出多选模式
    batchSelection.exitSelectionMode();
  }, [batchSelection, refetch]);

  // 批量删除 - 打开确认弹窗
  const handleBatchDelete = useCallback(() => {
    setBatchDeleteDialogOpen(true);
  }, []);

  // 批量删除确认回调
  const handleBatchDeleteConfirm = useCallback(async () => {
    const selectedIds = batchSelection.getSelectedIds();
    const success = await batchDeletePanels(selectedIds);
    if (success) {
      // 刷新数据
      refetch?.();
      // 退出多选模式
      batchSelection.exitSelectionMode();
    }
  }, [batchSelection, batchDeletePanels, refetch]);

  // AI 续写建议 - 采纳建议
  const handleAdoptContinuation = useCallback(
    async (suggestion: {
      description: string;
      visual_prompt: string;
      dialogue: string | null;
      emotion: string | null;
      camera_angle: string;
      shot_size: string;
      panel_type: string;
    }) => {
      if (!project) return;

      // 获取最后一个分镜的 order
      const lastPanel = project.panels[project.panels.length - 1];
      const insertOrder = lastPanel?.panel_order ?? 0;

      // 调用插入分镜 API
      const response = await fetch("/api/panel/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          insert_after_order: insertOrder,
          description: suggestion.description,
          use_llm: false,
          // 额外字段
          visual_prompt: suggestion.visual_prompt,
          dialogue: suggestion.dialogue,
          emotion: suggestion.emotion,
          camera_angle: suggestion.camera_angle,
          shot_size: suggestion.shot_size,
          panel_type: suggestion.panel_type,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "插入分镜失败");
      }

      // 刷新数据
      await refetch?.();
    },
    [project, refetch]
  );

  // AI 优化建议 - 打开弹窗
  const handleOpenOptimization = useCallback((panelId: string) => {
    setOptimizationPanelId(panelId);
    setOptimizationDialogOpen(true);
  }, []);

  // AI 优化建议 - 应用优化
  const handleApplyOptimization = useCallback(
    async (updates: {
      camera_angle?: string;
      shot_size?: string;
      panel_type?: string;
      visual_prompt?: string;
    }) => {
      if (!optimizationPanelId) return;

      await handlePanelUpdate(optimizationPanelId, updates);
    },
    [optimizationPanelId, handlePanelUpdate]
  );

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
    // 多选模式下不处理单选逻辑
    if (batchSelection.isSelectionMode) return;

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
            {/* AI 建议按钮 */}
            {!batchSelection.isSelectionMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setContinuationDialogOpen(true)}
                  className="text-primary border-primary/50 hover:bg-primary/10"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 续写
                </Button>
                {selectedPanelId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenOptimization(selectedPanelId)}
                    className="text-yellow-600 border-yellow-600/50 hover:bg-yellow-600/10"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    优化建议
                  </Button>
                )}
              </>
            )}
            {/* 多选模式切换按钮 */}
            {!batchSelection.isSelectionMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={batchSelection.enterSelectionMode}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                多选
              </Button>
            )}
            <Link href={`/storyboard/layout/${projectId}`}>
              <Button variant="outline" size="sm">
                <Grid className="w-4 h-4 mr-2" />
                排版
              </Button>
            </Link>
            <Button variant="comic" size="sm">
              <Save className="w-4 h-4" />
              保存项目
            </Button>
          </div>
        </div>

        {/* 批量操作工具栏 */}
        {batchSelection.isSelectionMode && (
          <BatchOperationToolbar
            selectedCount={batchSelection.getSelectedCount()}
            totalCount={project.panels.length}
            operationLoading={batchOperationLoading}
            onSelectAll={() => batchSelection.selectAll(allPanelIds)}
            onClearSelection={batchSelection.clearSelection}
            onExitSelectionMode={batchSelection.exitSelectionMode}
            onBatchCharacter={handleBatchCharacter}
            onBatchStyle={handleBatchStyle}
            onBatchCamera={handleBatchCamera}
            onBatchGenerate={handleBatchGenerate}
            onBatchDelete={handleBatchDelete}
          />
        )}
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
          onGeneratePrompt={(panelId, opts) => handleGeneratePrompt(panelId, opts)}
          onSelectionChange={handleSelectionChange}
          selections={panelSelections}
          characters={characters}
          styles={styles}
          operationLoading={operationLoading}
          // 批量选择 props
          isSelectionMode={batchSelection.isSelectionMode}
          batchSelectedIds={batchSelection.selectedIds}
          onToggleBatchSelection={batchSelection.toggleSelection}
          onShiftBatchSelect={handleShiftBatchSelect}
        />
      </div>

      {/* Insert Panel Dialog */}
      <InsertPanelDialog
        open={insertDialogOpen}
        onOpenChange={setInsertDialogOpen}
        onInsert={handleInsertPanelSubmit}
        insertAfterOrder={insertAfterOrder}
      />

      {/* Batch Camera Dialog */}
      <BatchCameraDialog
        open={batchCameraDialogOpen}
        onOpenChange={setBatchCameraDialogOpen}
        selectedPanelIds={batchSelection.getSelectedIds()}
        onConfirm={handleBatchCameraConfirm}
      />

      {/* Batch Delete Dialog */}
      <BatchDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        selectedCount={batchSelection.getSelectedCount()}
        onConfirm={handleBatchDeleteConfirm}
      />

      {/* Batch Style Dialog */}
      <BatchStyleDialog
        open={batchStyleDialogOpen}
        onOpenChange={setBatchStyleDialogOpen}
        selectedPanelIds={batchSelection.getSelectedIds()}
        onConfirm={handleBatchStyleConfirm}
      />

      {/* Batch Character Dialog */}
      <BatchCharacterDialog
        open={batchCharacterDialogOpen}
        onOpenChange={setBatchCharacterDialogOpen}
        selectedPanelIds={batchSelection.getSelectedIds()}
        characters={characters}
        onConfirm={handleBatchCharacterConfirm}
      />

      {/* Batch Generate Dialog */}
      <BatchGenerateDialog
        open={batchGenerateDialogOpen}
        onOpenChange={setBatchGenerateDialogOpen}
        selectedPanelIds={batchSelection.getSelectedIds()}
        onComplete={handleBatchGenerateComplete}
      />

      {/* AI 续写建议弹窗 */}
      <ContinuationSuggestionDialog
        open={continuationDialogOpen}
        onOpenChange={setContinuationDialogOpen}
        projectId={projectId}
        afterPanelId={selectedPanelId || undefined}
        onAdopt={handleAdoptContinuation}
      />

      {/* AI 优化建议弹窗 */}
      {optimizationPanelId && (
        <OptimizationSuggestionDialog
          open={optimizationDialogOpen}
          onOpenChange={(open) => {
            setOptimizationDialogOpen(open);
            if (!open) setOptimizationPanelId(null);
          }}
          panelId={optimizationPanelId}
          currentPanel={
            project.panels.find((p) => p.id === optimizationPanelId) || {
              description: "",
              camera_angle: null,
              shot_size: null,
              panel_type: "medium",
            }
          }
          onApply={handleApplyOptimization}
        />
      )}
    </div>
  );
}
