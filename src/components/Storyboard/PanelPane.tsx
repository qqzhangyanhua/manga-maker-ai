"use client";

import { MutableRefObject } from "react";
import EditablePanelCard from "@/components/Storyboard/EditablePanelCard";
import type { Panel, OperationLoadingState } from "@/types/storyboard";

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
  operationLoading: OperationLoadingState;
};

/**
 * 分镜列表面板组件
 * 展示所有分镜卡片，支持编辑、合并、拆分、插入等操作
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
  operationLoading,
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
            <EditablePanelCard
              panel={panel}
              isSelected={selectedPanelId === panel.id}
              onClick={() => onPanelClick(panel.id)}
              onUpdate={(updates) => onPanelUpdate(panel.id, updates)}
              onMerge={onMerge}
              onSplit={onSplit}
              onInsertAfter={onInsertAfter}
              onGenerateSketch={onGenerateSketch}
              operationLoading={operationLoading}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
