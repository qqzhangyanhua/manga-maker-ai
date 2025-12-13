/**
 * 分镜列表视图组件
 * 包含拖拽排序功能、高级操作和布局编辑
 */

"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, ImageIcon, Images, Sparkles } from "lucide-react";
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
import { SortablePanelCard } from "./PanelEditor/SortablePanelCard";
import { PanelCardActions } from "./PanelEditor/PanelCardActions";
import { InsertPanelDialog } from "./PanelEditor/InsertPanelDialog";
import { SplitPanelDialog } from "./PanelEditor/SplitPanelDialog";
import { BatchGenerationDialog } from "./BatchGenerationDialog";
import { BatchOperationsToolbar } from "./BatchOperationsToolbar";
import { LayoutModeToolbar } from "./LayoutModeToolbar";
import { LayoutPreview } from "./LayoutPreview";
import { PanelLayoutGroup } from "./PanelLayoutGroup";
import { usePanelDragDrop } from "../hooks/usePanelDragDrop";
import { usePanelGeneration } from "../hooks/usePanelGeneration";
import { useBatchGeneration } from "../hooks/useBatchGeneration";
import { useLayoutOperations } from "../hooks/useLayoutOperations";
import { ReferenceGuidedGenerationDialog } from "./PanelEditor/ReferenceGuidedGenerationDialog";
import type { Panel } from "../types/script-editor.types";
import type { CharacterReference } from "../types/character.types";
import { groupPanelsByLayout, isInLayoutGroup } from "../types/layout.types";
import type { LayoutSize, LayoutDirection, LayoutRatio } from "../types/layout.types";

interface PanelListViewProps {
  panels: Panel[];
  projectId: string | null;
  characters: CharacterReference[];
  charactersLoading?: boolean;
  onCharactersRefresh?: () => void | Promise<void>;
  onPanelsChange: (panels: Panel[]) => void;
  onEditPanel: (panel: Panel) => void;
  onDeletePanel: (id: string) => void;
  onAddPanel: () => void;
  onError: (message: string) => void;
  onImageGenerated?: (panelId: string, imageUrl: string) => void;
  onRefresh?: () => void; // New callback to trigger data refresh
  selectedCharacterId?: string | null; // Selected character from story character list
}

export function PanelListView({
  panels,
  projectId,
  characters,
  charactersLoading = false,
  onCharactersRefresh,
  onPanelsChange,
  onEditPanel,
  onDeletePanel,
  onAddPanel,
  onError,
  onImageGenerated,
  onRefresh,
  selectedCharacterId,
}: PanelListViewProps) {
  // 批量选择状态
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);

  // 高级操作对话框状态
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState(0);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitPanel, setSplitPanel] = useState<Panel | null>(null);
  const [mergingPanels, setMergingPanels] = useState<{ current: Panel; next: Panel } | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [guidedDialogOpen, setGuidedDialogOpen] = useState(false);
  const [targetPanel, setTargetPanel] = useState<Panel | null>(null);

  // 配置拖拽传感器（需要移动至少 5px 才触发拖拽，避免误触）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // 拖拽逻辑
  const { isDragging, draggingGroupIds, handleDragStart, handleDragEnd, handleDragCancel } =
    usePanelDragDrop({
      panels,
      projectId,
      onPanelsChange,
      onError,
    });

  // 图片生成逻辑
  const {
    generatingPanels,
    generateSingle,
    clearTask,
    retry,
  } = usePanelGeneration({
    onSuccess: (panelId, imageUrl) => {
      onImageGenerated?.(panelId, imageUrl);
      // 3秒后自动清除任务状态
      setTimeout(() => clearTask(panelId), 3000);
    },
    onError: (panelId, error) => {
      onError(error);
    },
  });

  // 批量生成逻辑
  const batchGeneration = useBatchGeneration(
    // Extract storyId from panels if available
    panels[0]?.project_id || '',
    projectId || ''
  );

  // 布局操作逻辑
  const layoutOps = useLayoutOperations({
    onSuccess: () => {
      onRefresh?.();
    },
    onError: (message) => {
      onError(message);
    },
  });

  // 按布局分组的Panel列表
  const panelGroups = useMemo(() => groupPanelsByLayout(panels), [panels]);

  // 计算布局预览数据
  const layoutPreviewData = useMemo(() => {
    if (!layoutOps.isLayoutMode || layoutOps.selectedPanelIds.length === 0) {
      return { selectedPanels: [], availableLayouts: [] };
    }

    // 获取选中的Panel（按panel_order排序）
    const selectedPanels = layoutOps.selectedPanelIds
      .map((id) => panels.find((p) => p.id === id))
      .filter((p): p is Panel => p !== undefined)
      .sort((a, b) => a.panel_order - b.panel_order);

    const count = selectedPanels.length;

    // 根据选中数量确定可用布局
    type LayoutOption = { size: "2" | "3" | "4" | "6"; direction?: "h" | "v"; label: string };
    const availableLayouts: LayoutOption[] = [];

    if (count === 2) {
      availableLayouts.push(
        { size: "2", direction: "h", label: "2镜横排" },
        { size: "2", direction: "v", label: "2镜竖排" }
      );
    } else if (count === 3) {
      availableLayouts.push(
        { size: "3", direction: "h", label: "3镜横排" },
        { size: "3", direction: "v", label: "3镜竖排" }
      );
    } else if (count === 4) {
      availableLayouts.push({ size: "4", label: "4镜网格" });
    } else if (count === 6) {
      availableLayouts.push({ size: "6", label: "6镜网格" });
    }

    return { selectedPanels, availableLayouts };
  }, [layoutOps.isLayoutMode, layoutOps.selectedPanelIds, panels]);

  // 批量应用布局到所有未组合的分镜
  const handleBatchApplyLayout = async (
    layoutType: LayoutSize,
    direction?: LayoutDirection,
    ratio?: LayoutRatio
  ) => {
    const requiredCount = parseInt(layoutType, 10);

    // 找出所有未组合的分镜（按 panel_order 排序）
    const ungroupedPanels = panels
      .filter((p) => !isInLayoutGroup(p))
      .sort((a, b) => a.panel_order - b.panel_order);

    // 分组：找出连续的分镜组
    const groups: Panel[][] = [];
    let currentGroup: Panel[] = [];

    for (let i = 0; i < ungroupedPanels.length; i++) {
      const panel = ungroupedPanels[i];

      if (currentGroup.length === 0) {
        currentGroup.push(panel);
      } else {
        const lastPanel = currentGroup[currentGroup.length - 1];
        // 检查是否连续
        if (panel.panel_order === lastPanel.panel_order + 1) {
          currentGroup.push(panel);
        } else {
          // 不连续，保存当前组并开始新组
          if (currentGroup.length >= requiredCount) {
            groups.push(currentGroup);
          }
          currentGroup = [panel];
        }
      }

      // 当组满足数量时，保存并开始新组
      if (currentGroup.length === requiredCount) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    }

    // 处理最后一组
    if (currentGroup.length >= requiredCount) {
      // 只取前 requiredCount 个
      groups.push(currentGroup.slice(0, requiredCount));
    }

    if (groups.length === 0) {
      onError("没有足够的连续分镜可以应用布局");
      return;
    }

    // 依次应用布局
    try {
      for (const group of groups) {
        const panelIds = group.map((p) => p.id);
        await layoutOps.applyLayout(panelIds, layoutType, direction, ratio);
      }
      onRefresh?.();
    } catch (error) {
      onError(error instanceof Error ? error.message : "批量应用布局失败");
    }
  };

  // 生成单个分镜图片
  const handleGenerateSingle = async (panel: Panel) => {
    if (!panel.prompt_used && !panel.visual_prompt) {
      onError("分镜缺少提示词，请先编辑分镜添加描述");
      return;
    }

    // 检查是否绑定了角色
    if (!panel.character_id) {
      // 如果左侧选择了故事角色，自动绑定
      if (selectedCharacterId) {
        try {
          console.log(`[PanelListView] 自动绑定左侧选中的角色 ${selectedCharacterId} 到分镜 ${panel.id}`);

          // 更新分镜绑定角色
          const response = await fetch(`/api/panel/${panel.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              character_id: selectedCharacterId,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "绑定角色失败");
          }

          // 刷新数据以获取更新后的分镜
          await onRefresh?.();

          // 使用更新后的 character_id 继续生成
          panel = { ...panel, character_id: selectedCharacterId };
        } catch (error) {
          console.error("[PanelListView] 自动绑定角色失败:", error);
          onError(error instanceof Error ? error.message : "绑定角色失败");
          return;
        }
      } else {
        // 没有选中角色，弹出警告
        const confirmGenerate = window.confirm(
          "⚠️ 未绑定角色参考\n\n" +
          "当前分镜没有绑定角色，将不会使用角色参考图生成。\n" +
          "建议：\n" +
          "1. 在左侧「故事角色」区域选择一个角色\n" +
          "2. 或者编辑分镜，在「资产绑定」区域选择角色\n\n" +
          "是否继续生成？"
        );
        if (!confirmGenerate) {
          return;
        }
      }
    }

    const prompt = panel.prompt_used || panel.visual_prompt || panel.description;
    try {
      await generateSingle(panel.id, prompt);
    } catch (error) {
      // 错误已在 Hook 中处理
    }
  };

  const openGuidedDialog = (panel: Panel) => {
    setTargetPanel(panel);
    setGuidedDialogOpen(true);
  };

  // 高级操作：在指定分镜之后插入
  const handleInsertAfter = (panel: Panel) => {
    setInsertAfterIndex(panel.panel_order);
    setInsertDialogOpen(true);
  };

  // 高级操作：拆分分镜
  const handleSplit = (panel: Panel) => {
    setSplitPanel(panel);
    setSplitDialogOpen(true);
  };

  // 高级操作：与下一镜合并
  const handleMergeWithNext = async (panel: Panel) => {
    const currentIndex = panels.findIndex((p) => p.id === panel.id);
    if (currentIndex === -1 || currentIndex === panels.length - 1) {
      onError("无法合并：这是最后一个分镜");
      return;
    }

    const nextPanel = panels[currentIndex + 1];
    setMergingPanels({ current: panel, next: nextPanel });
  };

  // 确认合并分镜
  const confirmMerge = async () => {
    if (!mergingPanels) return;

    try {
      console.log("[PanelListView] Merging panels:", {
        currentId: mergingPanels.current.id,
        nextId: mergingPanels.next.id,
        projectId,
      });

      const response = await fetch("/api/panel/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panel_ids: [mergingPanels.current.id, mergingPanels.next.id],
          project_id: projectId,
        }),
      });

      const data = await response.json();
      console.log("[PanelListView] Merge response:", { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || "合并分镜失败");
      }

      // Trigger refresh via callback instead of full page reload
      console.log("[PanelListView] Merge successful, refreshing panels...");
      await onRefresh?.();
    } catch (error) {
      console.error("[PanelListView] Merge error:", error);
      const message = error instanceof Error ? error.message : "合并分镜失败";
      onError(message);
    } finally {
      setMergingPanels(null);
    }
  };

  // 对话框关闭后的刷新回调
  const handleOperationComplete = () => {
    // Trigger refresh via callback instead of full page reload
    onRefresh?.();
  };

  // 计算待生成的分镜数量
  const panelsToGenerate = panels.filter(
    (p) => (p.prompt_used || p.visual_prompt) && !p.generated_image && !p.image_url
  );

  // 批量删除函数
  async function handleBatchDelete(ids: string[]): Promise<void> {
    if (!projectId) {
      throw new Error("项目 ID 不存在");
    }

    const response = await fetch("/api/panel/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ panel_ids: ids }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "批量删除失败");
    }

    // 触发刷新
    onRefresh?.();
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          分镜列表 ({panels.length})
        </h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            type="button"
            disabled={charactersLoading || characters.length === 0}
            onClick={() => {
              const candidate = panels.find((p) => !p.generated_image && !p.image_url) || panels[0];
              if (candidate) {
                openGuidedDialog(candidate);
              } else {
                onError("暂无可生成的分镜");
              }
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" />锁脸生成
          </Button>
          {panelsToGenerate.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setBatchDialogOpen(true);
                batchGeneration.startBatchGeneration(panelsToGenerate);
              }}
              disabled={panelsToGenerate.length === 0 || batchGeneration.isGenerating}
            >
              <Images className="w-4 h-4 mr-2" />
              批量生成 ({panelsToGenerate.length})
            </Button>
          )}
          <Button onClick={onAddPanel} disabled={!projectId}>
            <Plus className="w-4 h-4 mr-2" />
            添加分镜
          </Button>
        </div>
      </div>

      {/* 批量操作工具栏 */}
      {panels.length > 0 && !layoutOps.isLayoutMode && (
        <BatchOperationsToolbar
          panels={panels}
          selectedPanelIds={selectedPanelIds}
          onSelectionChange={setSelectedPanelIds}
          onBatchDelete={handleBatchDelete}
          onRefresh={onRefresh}
        />
      )}

      {/* 布局模式工具栏 */}
      {panels.length > 0 && (
        <TooltipProvider>
          <LayoutModeToolbar
            isLayoutMode={layoutOps.isLayoutMode}
            selectedPanelIds={layoutOps.selectedPanelIds}
            panels={panels}
            isApplying={layoutOps.isApplying}
            onEnterLayoutMode={layoutOps.enterLayoutMode}
            onExitLayoutMode={layoutOps.exitLayoutMode}
            onApplyLayout={(layoutType, direction, ratio) =>
              layoutOps.applyLayout(layoutOps.selectedPanelIds, layoutType, direction, ratio)
            }
            onBatchApplyLayout={handleBatchApplyLayout}
            canUndo={layoutOps.canUndo}
            onUndo={layoutOps.undoLastOperation}
            onClearSelection={layoutOps.clearSelection}
          />
        </TooltipProvider>
      )}

      {/* 布局预览 */}
      {layoutOps.isLayoutMode && layoutPreviewData.selectedPanels.length > 0 && (
        <LayoutPreview
          selectedPanels={layoutPreviewData.selectedPanels}
          availableLayouts={layoutPreviewData.availableLayouts}
        />
      )}

      {/* 分镜列表 */}
      {panels.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">暂无分镜</p>
          <Button
            variant="link"
            onClick={onAddPanel}
            disabled={!projectId}
            className="mt-2"
          >
            立即添加
          </Button>
        </div>
      ) : layoutOps.isLayoutMode ? (
        // 布局模式：使用PanelLayoutGroup渲染布局组
        <TooltipProvider>
          <div className="space-y-4">
            {panelGroups.map((group) => {
              const groupPanelIds = group.panels.map((p) => p.id);
              const isGroupSelected = groupPanelIds.every((id) =>
                layoutOps.selectedPanelIds.includes(id)
              );

              return (
                <PanelLayoutGroup
                  key={group.groupStartId}
                  group={group}
                  isLayoutMode={true}
                  isSelected={isGroupSelected}
                  selectedPanelIds={layoutOps.selectedPanelIds}
                  onSelect={(selected) => {
                    if (selected) {
                      layoutOps.selectPanelGroup(groupPanelIds);
                    } else {
                      // 取消选择组内所有Panel
                      groupPanelIds.forEach((id) => {
                        if (layoutOps.selectedPanelIds.includes(id)) {
                          layoutOps.togglePanelSelection(id);
                        }
                      });
                    }
                  }}
                  onSelectWithModifiers={(panelId, modifiers) =>
                    layoutOps.selectPanelWithModifiers(panelId, panels, modifiers)
                  }
                  onBreakLayout={() => layoutOps.breakLayout(group.groupStartId)}
                  generatingPanels={generatingPanels}
                  onEditPanel={onEditPanel}
                  onDeletePanel={onDeletePanel}
                  onGenerateSingle={handleGenerateSingle}
                  onInsertAfter={handleInsertAfter}
                  onSplit={handleSplit}
                  onMergeWithNext={handleMergeWithNext}
                  onRetryGeneration={retry}
                  onCancelGeneration={clearTask}
                  allPanels={panels}
                />
              );
            })}
          </div>
        </TooltipProvider>
      ) : (
        // 正常模式：使用PanelLayoutGroup渲染布局组（支持拆分）
        <TooltipProvider>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={panels.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {panelGroups.map((group) => {
                  // 检查这个组是否正在被拖拽
                  const isGroupDragging = draggingGroupIds.length > 1 &&
                    group.panels.some((p) => draggingGroupIds.includes(p.id));

                  return (
                    <div
                      key={group.groupStartId}
                      className={isGroupDragging ? "ring-2 ring-primary ring-offset-2 rounded-lg transition-all" : ""}
                    >
                      <PanelLayoutGroup
                        group={group}
                        isLayoutMode={false}
                        isSelected={false}
                        onSelect={() => {}}
                        onBreakLayout={() => layoutOps.breakLayout(group.groupStartId)}
                        generatingPanels={generatingPanels}
                        onEditPanel={onEditPanel}
                        onDeletePanel={onDeletePanel}
                        onGenerateSingle={handleGenerateSingle}
                        onInsertAfter={handleInsertAfter}
                        onSplit={handleSplit}
                        onMergeWithNext={handleMergeWithNext}
                        onRetryGeneration={retry}
                        onCancelGeneration={clearTask}
                        allPanels={panels}
                      />
                    </div>
                  );
                })}
              </div>
            </SortableContext>

            {/* 拖拽时的视觉反馈 */}
            {isDragging && (
              <div className="fixed inset-0 bg-background/50 pointer-events-none z-40" />
            )}
          </DndContext>
        </TooltipProvider>
      )}

      {/* 高级操作对话框 */}
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
            panel={splitPanel}
            onOpenChange={setSplitDialogOpen}
            onSplit={handleOperationComplete}
            onError={onError}
          />
        </>
      )}

      {/* 合并确认对话框 */}
      <AlertDialog open={!!mergingPanels} onOpenChange={(open) => !open && setMergingPanels(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认合并分镜</AlertDialogTitle>
            <AlertDialogDescription>
              {mergingPanels && (
                <>
                  确定要合并分镜 <strong>#{mergingPanels.current.panel_order}</strong> 和{" "}
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

      {/* Batch Generation Progress Dialog */}
      <BatchGenerationDialog
        open={batchDialogOpen}
        tasks={batchGeneration.tasks}
        onClose={() => {
          setBatchDialogOpen(false);
          batchGeneration.cancelGeneration();
        }}
      />

      {/* 角色参考引导生成 */}
      <ReferenceGuidedGenerationDialog
        open={guidedDialogOpen}
        panel={targetPanel}
        characters={characters}
        onCharactersRefresh={onCharactersRefresh}
        onOpenChange={(open) => {
          setGuidedDialogOpen(open);
          if (!open) {
            setTargetPanel(null);
          }
        }}
        onGenerated={(panelId, imageUrl) => {
          onImageGenerated?.(panelId, imageUrl);
          onRefresh?.();
        }}
        onPromptUpdated={() => {
          onRefresh?.();
        }}
      />
    </div>
  );
}
