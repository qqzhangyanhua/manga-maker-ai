"use client";

import { MutableRefObject } from "react";
import EditablePanelCard from "@/components/Storyboard/EditablePanelCard";
import SelectablePanelWrapper from "@/components/Storyboard/SelectablePanelWrapper";
import type { Panel, OperationLoadingState } from "@/types/storyboard";
import type { StoryboardCharacter, StoryboardStyle } from "@/hooks/use-storyboard-data";

type PanelSelection = {
  characterId?: string;
  styleKey?: string;
};

type PanelPaneProps = {
  panels: Panel[];
  selectedPanelId: string | null;
  panelRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  onPanelClick: (panelId: string) => void;
  onPanelUpdate: (panelId: string, updates: Partial<Panel>) => void;
  onMerge: (panelId: string) => void;
  onSplit: (panelId: string) => void;
  onInsertAfter: (panelOrder: number) => void;
  onGenerateSketch: (panelId: string) => void;
  onGeneratePrompt: (panelId: string, opts?: PanelSelection) => void;
  onSelectionChange: (panelId: string, selection: PanelSelection) => void;
  operationLoading: OperationLoadingState;
  characters: StoryboardCharacter[];
  styles: StoryboardStyle[];
  selections: Record<string, PanelSelection>;
  // 批量选择相关 props
  isSelectionMode?: boolean;
  batchSelectedIds?: Set<string>;
  onToggleBatchSelection?: (id: string) => void;
  onShiftBatchSelect?: (id: string) => void;
};

/**
 * 分镜列表面板组件
 * 展示所有分镜卡片，支持编辑、合并、拆分、插入等操作
 * 支持多选模式
 */
export default function PanelPane({
  panels,
  selectedPanelId,
  panelRefs,
  onPanelClick,
  onPanelUpdate,
  onMerge,
  onSplit,
  onInsertAfter,
  onGenerateSketch,
  onGeneratePrompt,
  onSelectionChange,
  operationLoading,
  characters,
  styles,
  selections,
  // 批量选择 props
  isSelectionMode = false,
  batchSelectedIds = new Set(),
  onToggleBatchSelection,
  onShiftBatchSelect,
}: PanelPaneProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-4">
        {panels.map((panel) => (
          <div
            key={panel.id}
            ref={(el) => {
              panelRefs.current[panel.id] = el;
            }}
          >
            <SelectablePanelWrapper
              panelId={panel.id}
              panelOrder={panel.panel_order}
              isSelectionMode={isSelectionMode}
              isBatchSelected={batchSelectedIds.has(panel.id)}
              onToggleSelection={onToggleBatchSelection || (() => {})}
              onShiftClick={onShiftBatchSelect}
            >
              <EditablePanelCard
                panel={panel}
                isSelected={selectedPanelId === panel.id}
                onClick={() => onPanelClick(panel.id)}
                onUpdate={(updates) => onPanelUpdate(panel.id, updates)}
                onMerge={onMerge}
                onSplit={onSplit}
                onInsertAfter={onInsertAfter}
                onGenerateSketch={onGenerateSketch}
                onGeneratePrompt={onGeneratePrompt}
                onSelectionChange={onSelectionChange}
                selection={selections[panel.id] || {}}
                characters={characters}
                styles={styles}
                operationLoading={operationLoading}
              />
            </SelectablePanelWrapper>
          </div>
        ))}
      </div>
    </div>
  );
}
