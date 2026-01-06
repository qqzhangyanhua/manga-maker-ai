"use client";

import { SerialChapterList } from "@/components/SerialChapterList";
import type { Panel as SerialPanel, Chapter as SerialChapter, CharacterReference } from "@/components/SerialChapterList/types";
import { BatchOperationBar } from "@/components/common/BatchOperationBar";
import { useScriptData } from "../providers/ScriptDataProvider";
import { useScriptOperations } from "../providers/ScriptOperationsProvider";
import { useUIState } from "../hooks/useUIState";
import { useBatchSelection } from "@/hooks/useBatchSelection";
import { useToast } from "@/hooks/use-toast";
import type { Panel } from "../types/providers.types";
import type { Character } from "@prisma/client";

interface SerialTabProps {
  nextChapterOrder: number;
  isGeneratingPanels: boolean;
  streamingPanels: unknown[];
  onGeneratePanels: (chapterId: string) => void;
  onDeletePanel: (panelId: string) => Promise<void>;
  onImageGenerated: (panelId: string, imageUrl: string) => Promise<void>;
}

/**
 * 将 Prisma Panel 转换为 SerialChapterList 所需的 Panel 类型
 */
function adaptPanelForSerial(panel: Panel): SerialPanel {
  return {
    id: panel.id,
    chapter_id: panel.chapter_id || undefined,
    generated_image: panel.generated_image || undefined,
    image_url: panel.generated_image || undefined,
    panel_order: panel.panel_order,
    prompt_used: panel.prompt_used || undefined,
    created_at: new Date().toISOString(), // Panel 没有 created_at，使用当前时间
    updated_at: new Date().toISOString(), // Panel 没有 updated_at，使用当前时间
  };
}

/**
 * 将 Prisma Chapter 转换为 SerialChapterList 所需的 Chapter 类型
 */
function adaptChapterForSerial(chapter: {
  id: string;
  title: string;
  summary: string | null;
  chapter_order: number;
  publish_status: string;
  published_at: Date | null;
  created_at: Date;
}): SerialChapter {
  return {
    id: chapter.id,
    title: chapter.title,
    summary: chapter.summary,
    chapter_order: chapter.chapter_order,
    publish_status: chapter.publish_status,
    published_at: chapter.published_at?.toISOString() || null,
    created_at: chapter.created_at.toISOString(),
  };
}

/**
 * 将 Prisma Character 转换为 CharacterReference 类型
 */
function adaptCharacterForSerial(character: Character): CharacterReference {
  return {
    id: character.id,
    name: character.name,
    description: character.description,
    base_image_url: character.base_image_url,
  };
}

/**
 * 章节创作 Tab 组件
 *
 * 职责：
 * 1. 展示章节列表和分镜
 * 2. 提供批量操作工具栏
 * 3. 处理章节相关的业务逻辑
 *
 * 优点：
 * - 将 Tab 内容从 page.tsx 拆分出来
 * - 减少父组件复杂度
 * - 独立的业务逻辑边界
 */
export function SerialTab({
  nextChapterOrder,
  isGeneratingPanels,
  streamingPanels,
  onGeneratePanels,
  onDeletePanel,
  onImageGenerated,
}: SerialTabProps) {
  const { toast } = useToast();
  const {
    storyId,
    projectId,
    chapters,
    panels,
    characterAssets,
    isCharactersLoading,
    refetchAll,
    refetchCharacters,
  } = useScriptData();

  const {
    batchOperation,
    handleBatchGenerate,
    handleBatchDelete,
  } = useScriptOperations();

  const { actions: uiActions } = useUIState();

  // 批量选择
  const panelSelection = useBatchSelection(panels, {
    getId: (panel: Panel) => panel.id,
  });

  // 适配数据类型
  const adaptedChapters = chapters.map(adaptChapterForSerial);
  const adaptedPanels = panels.map(adaptPanelForSerial);
  const adaptedCharacters = characterAssets.map(adaptCharacterForSerial);
  const adaptedStreamingPanels = (streamingPanels as Panel[]).map(adaptPanelForSerial);

  return (
    <>
      {/* 批量操作工具栏 */}
      {panelSelection.selectedCount > 0 && (
        <div className="mb-4">
          <BatchOperationBar
            selectedCount={panelSelection.selectedCount}
            totalCount={panels.length}
            onSelectAll={panelSelection.selectAll}
            onDeselectAll={panelSelection.deselectAll}
            onBatchGenerate={() =>
              void handleBatchGenerate(Array.from(panelSelection.selected))
            }
            onBatchDelete={() =>
              void handleBatchDelete(Array.from(panelSelection.selected))
            }
            isGenerating={batchOperation.isGenerating}
            generatingProgress={batchOperation.progress}
          />
        </div>
      )}

      {/* 章节列表 */}
      <SerialChapterList
        storyId={storyId}
        projectId={projectId}
        chapters={adaptedChapters}
        panels={adaptedPanels}
        characters={adaptedCharacters}
        charactersLoading={isCharactersLoading}
        isGeneratingPanels={isGeneratingPanels}
        streamingPanels={adaptedStreamingPanels}
        onRefresh={refetchAll}
        onCreateChapter={() => {
          uiActions.openChapterDialog("create", nextChapterOrder);
        }}
        onGenerateNext={() => {
          uiActions.openChapterDialog("generate-next", nextChapterOrder);
        }}
        onGeneratePanels={(chapterId) => {
          uiActions.setCurrentChapter(chapterId);
          onGeneratePanels(chapterId);
        }}
        onDeletePanel={onDeletePanel}
        onImageGenerated={onImageGenerated}
        onCharactersRefresh={() => void refetchCharacters()}
        onError={(msg) =>
          toast({ title: "错误", description: msg, variant: "destructive" })
        }
      />
    </>
  );
}
