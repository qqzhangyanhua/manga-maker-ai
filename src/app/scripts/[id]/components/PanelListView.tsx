/**
 * 分镜列表视图组件
 * 包含拖拽排序功能和高级操作
 */

"use client";

import { useState } from "react";
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
import { SortablePanelCard } from "./PanelEditor/SortablePanelCard";
import { PanelCardActions } from "./PanelEditor/PanelCardActions";
import { InsertPanelDialog } from "./PanelEditor/InsertPanelDialog";
import { SplitPanelDialog } from "./PanelEditor/SplitPanelDialog";
import { BatchGenerationDialog } from "./BatchGenerationDialog";
import { usePanelDragDrop } from "../hooks/usePanelDragDrop";
import { usePanelGeneration } from "../hooks/usePanelGeneration";
import { useBatchGeneration } from "../hooks/useBatchGeneration";
import { ReferenceGuidedGenerationDialog } from "./PanelEditor/ReferenceGuidedGenerationDialog";
import type { Panel } from "../types/script-editor.types";
import type { CharacterReference } from "../types/character.types";

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
}: PanelListViewProps) {
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
  const { isDragging, handleDragStart, handleDragEnd, handleDragCancel } =
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

  // 生成单个分镜图片
  const handleGenerateSingle = async (panel: Panel) => {
    if (!panel.prompt_used && !panel.visual_prompt) {
      onError("分镜缺少提示词，请先编辑分镜添加描述");
      return;
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

      // Trigger refresh via callback instead of full page reload
      onRefresh?.();
    } catch (error) {
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
      ) : (
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
              {panels.map((panel, index) => {
                const generationTask = generatingPanels.get(panel.id);
                const isGenerating = generationTask?.status === "processing" || generationTask?.status === "pending";
                const canMergeWithNext = index < panels.length - 1;

                return (
                  <SortablePanelCard
                    key={panel.id}
                    panel={panel}
                    index={index}
                    generationTask={generationTask}
                    onRetryGeneration={() => {
                      const prompt = panel.prompt_used || panel.visual_prompt || panel.description;
                      retry(panel.id, prompt);
                    }}
                    onCancelGeneration={() => clearTask(panel.id)}
                    actions={
                      <PanelCardActions
                        panel={panel}
                        onEdit={onEditPanel}
                        onDelete={onDeletePanel}
                        onGenerate={handleGenerateSingle}
                        isGenerating={isGenerating}
                        onInsertAfter={handleInsertAfter}
                        onSplit={handleSplit}
                        onMergeWithNext={handleMergeWithNext}
                        canMergeWithNext={canMergeWithNext}
                      />
                    }
                  />
                );
              })}
            </div>
          </SortableContext>

          {/* 拖拽时的视觉反馈 */}
          {isDragging && (
            <div className="fixed inset-0 bg-background/50 pointer-events-none z-40" />
          )}
        </DndContext>
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
