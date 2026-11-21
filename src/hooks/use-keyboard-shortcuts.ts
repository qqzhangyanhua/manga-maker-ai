import { useEffect } from "react";
import type { Project } from "@/types/storyboard";

type KeyboardShortcutsOptions = {
  selectedPanelId: string | null;
  project: Project | null;
  onMerge: (panelId: string) => void;
  onSplit: (panelId: string) => void;
  onInsertAfter: (panelOrder: number, panelId: string) => void;
};

/**
 * 全局快捷键监听 Hook
 * - Cmd/Ctrl + M: 合并分镜
 * - Cmd/Ctrl + D: 拆分分镜
 * - Cmd/Ctrl + I: 插入分镜
 */
export function useKeyboardShortcuts({
  selectedPanelId,
  project,
  onMerge,
  onSplit,
  onInsertAfter,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPanelId) return;

      // Cmd/Ctrl + M: 合并
      if ((e.metaKey || e.ctrlKey) && e.key === "m") {
        e.preventDefault();
        onMerge(selectedPanelId);
      }
      // Cmd/Ctrl + D: 拆分
      else if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        onSplit(selectedPanelId);
      }
      // Cmd/Ctrl + I: 插入
      else if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        const panel = project?.panels.find((p) => p.id === selectedPanelId);
        if (panel) {
          onInsertAfter(panel.panel_order, panel.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPanelId, project, onMerge, onSplit, onInsertAfter]);
}
