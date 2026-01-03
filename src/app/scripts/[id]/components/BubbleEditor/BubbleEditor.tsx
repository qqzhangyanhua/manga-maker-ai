/**
 * 气泡编辑器主组件
 */

"use client";

import { BubbleStylePicker } from "./BubbleStylePicker";
import { BubbleList } from "./BubbleList";
import { BubbleTextEditor } from "./BubbleTextEditor";
import { SpeechBubble, BubbleType } from "./types";

export interface BubbleEditorProps {
  bubbles: SpeechBubble[];
  selectedBubbleId: string | null;
  editingPanelId: string | null;
  onAddBubble: (panelId: string, type: BubbleType) => void;
  onUpdateBubble: (id: string, updates: Partial<SpeechBubble>) => void;
  onDeleteBubble: (id: string) => void;
  onSelectBubble: (id: string | null) => void;
  autoFocusTextarea?: boolean; // 是否自动聚焦文本框（双击触发）
  onMoveLayer?: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
}

export function BubbleEditor({
  bubbles,
  selectedBubbleId,
  editingPanelId,
  onAddBubble,
  onUpdateBubble,
  onDeleteBubble,
  onSelectBubble,
  autoFocusTextarea = false,
  onMoveLayer,
}: BubbleEditorProps) {
  const selectedBubble = bubbles.find((b) => b.id === selectedBubbleId) || null;

  const handleSelectType = (type: BubbleType) => {
    if (!editingPanelId) return;
    onAddBubble(editingPanelId, type);
  };

  return (
    <div className="space-y-4">
      {/* 气泡样式选择器 */}
      <BubbleStylePicker
        selectedType={selectedBubble?.type || null}
        onSelectType={handleSelectType}
        disabled={!editingPanelId}
      />

      {/* 气泡列表 */}
      <BubbleList
        bubbles={bubbles}
        editingPanelId={editingPanelId}
        selectedBubbleId={selectedBubbleId}
        onAddBubble={() => editingPanelId && onAddBubble(editingPanelId, "dialog")}
        onSelectBubble={onSelectBubble}
        onDeleteBubble={onDeleteBubble}
        onMoveLayer={onMoveLayer}
      />

      {/* 文字编辑器 - 仅在选中气泡时显示 */}
      {selectedBubble && (
        <BubbleTextEditor
          bubble={selectedBubble}
          onUpdate={(updates) => onUpdateBubble(selectedBubble.id, updates)}
          autoFocus={autoFocusTextarea}
        />
      )}
    </div>
  );
}
