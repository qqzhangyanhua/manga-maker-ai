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
import { Plus, ImageIcon, Images, Sparkles, Loader2 } from "lucide-react";
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
import { usePanelDragDrop } from "../hooks/usePanelDragDrop";
import { usePanelGeneration } from "../hooks/usePanelGeneration";
import { MultiPanelGenerateDialog } from "./MultiPanelGenerateDialog";
import { useToast } from "@/hooks/use-toast";
import type { Panel } from "../types/script-editor.types";
import type { CharacterReference } from "../types/character.types";

interface PanelListViewProps {
  panels: Panel[];
  projectId: string | null;
  storyId?: string; // 故事 ID
  currentChapterId?: string | null; // 当前章节 ID（用于过滤分镜）
  onGeneratePanelsForChapter?: (chapterId: string) => void; // AI生成分镜回调
  isGeneratingPanels?: boolean; // AI生成分镜的 loading 状态
  streamingPanels?: Panel[]; // 流式生成中的临时分镜（还未保存到数据库）
  characters: CharacterReference[];
  charactersLoading?: boolean;
  onCharactersRefresh?: () => void | Promise<void>;
  onPanelsChange: (panels: Panel[]) => void;
  onEditPanel?: (panel: Panel) => void;
  onDeletePanel?: (id: string) => void;
  onAddPanel?: () => void;
  onError: (message: string) => void;
  onImageGenerated?: (panelId: string, imageUrl: string) => void;
  onRefresh?: () => void; // New callback to trigger data refresh
}

export function PanelListView({
  panels,
  projectId,
  storyId,
  currentChapterId,
  onGeneratePanelsForChapter,
  isGeneratingPanels = false,
  streamingPanels = [],
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
  const { toast } = useToast();

  // 过滤当前章节的分镜
  const filteredPanels = useMemo(() => {
    if (!currentChapterId) return panels;
    return panels.filter((p) => p.chapter_id === currentChapterId);
  }, [panels, currentChapterId]);

  // 合并已保存的分镜和临时生成中的分镜
  const displayPanels = useMemo(() => {
    // 将临时生成的分镜转换为 Panel 对象（添加临时 ID 和标记）
    const tempPanels: Panel[] = streamingPanels.map((panel) => ({
      ...panel,
      id: `temp-${panel.panel_order}`, // 临时 ID
      project_id: projectId || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // 添加一个自定义字段标记为临时状态
      _isGenerating: true,
    } as Panel & { _isGenerating: boolean }));

    // 合并并按 panel_order 排序
    return [...filteredPanels, ...tempPanels].sort(
      (a, b) => a.panel_order - b.panel_order
    );
  }, [filteredPanels, streamingPanels, projectId]);

  // 高级操作对话框状态
  const [insertDialogOpen, setInsertDialogOpen] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState(0);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitPanel, setSplitPanel] = useState<Panel | null>(null);
  const [mergingPanels, setMergingPanels] = useState<{ current: Panel; next: Panel } | null>(null);
  const [multiPanelDialogOpen, setMultiPanelDialogOpen] = useState(false);

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
      panels: filteredPanels,
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

  // 生成单个分镜图片
  const handleGenerateSingle = async (panel: Panel) => {
    if (!panel.prompt_used && !panel.visual_prompt) {
      onError("分镜缺少提示词，请先编辑分镜添加描述");
      return;
    }

    const prompt = panel.prompt_used || panel.visual_prompt || panel.description;
    await generateSingle(panel.id, prompt);
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

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          分镜列表 ({filteredPanels.length})
        </h2>
        <div className="flex gap-2">
          {/* AI生成分镜按钮（章节级别） */}
          {currentChapterId && onGeneratePanelsForChapter && (
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={() => onGeneratePanelsForChapter(currentChapterId)}
              disabled={isGeneratingPanels}
            >
              {isGeneratingPanels ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI生成分镜
                </>
              )}
            </Button>
          )}
          <Button
            variant="secondary"
            type="button"
            onClick={() => setMultiPanelDialogOpen(true)}
            disabled={filteredPanels.length === 0}
          >
            <Sparkles className="w-4 h-4 mr-2" />多镜生成
          </Button>
          {onAddPanel && (
            <Button onClick={onAddPanel} disabled={!projectId}>
              <Plus className="w-4 h-4 mr-2" />
              添加分镜
            </Button>
          )}
        </div>
      </div>

      {/* 分镜列表 */}
      {panels.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">暂无分镜</p>
          {onAddPanel && (
            <Button
              variant="link"
              onClick={onAddPanel}
              disabled={!projectId}
              className="mt-2"
            >
              立即添加
            </Button>
          )}
        </div>
      ) : (
        // 正常模式：使用SortablePanelCard渲染分镜
        <TooltipProvider>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={displayPanels.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {displayPanels.map((panel, index) => (
                  <SortablePanelCard
                    key={panel.id}
                    panel={panel}
                    index={index}
                    generationTask={generatingPanels.get(panel.id)}
                    onRetryGeneration={() => {
                      const prompt = panel.prompt_used || panel.visual_prompt || panel.description || '';
                      retry(panel.id, prompt);
                    }}
                    onCancelGeneration={() => clearTask(panel.id)}
                    actions={
                      <PanelCardActions
                        panel={panel}
                        onEdit={() => onEditPanel?.(panel)}
                        onDelete={() => onDeletePanel?.(panel.id)}
                        onGenerate={() => handleGenerateSingle(panel)}
                        onInsertAfter={() => handleInsertAfter(panel)}
                        onSplit={() => handleSplit(panel)}
                        onMergeWithNext={() => handleMergeWithNext(panel)}
                      />
                    }
                  />
                ))}
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

      {/* 多镜生成对话框 */}
      <MultiPanelGenerateDialog
        open={multiPanelDialogOpen}
        panels={panels}
        storyId={storyId}
        onOpenChange={setMultiPanelDialogOpen}
        onSuccess={(imageUrl, panelIds) => {
          console.log("[PanelListView] 多镜生成成功:", { imageUrl, panelIds });
          onRefresh?.();
        }}
      />
    </div>
  );
}
