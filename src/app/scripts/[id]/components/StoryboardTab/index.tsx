/**
 * 故事板 Tab 主组件
 * 提供全局缩略图视图
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { StoryboardChapterSection } from "./StoryboardChapterSection";
import { StoryboardZoomControl } from "./StoryboardZoomControl";
import { StoryboardPanelInfo } from "./StoryboardPanelInfo";
import type { Panel } from "../../types/script-editor.types";

interface Chapter {
  id: string;
  title: string;
  chapter_order: number;
}

interface StoryboardTabProps {
  chapters: Chapter[];
  panels: Panel[];
  onPanelDoubleClick: (panelId: string, chapterId: string) => void;
  onGeneratePanels?: (chapterId: string) => void;
}

type ThumbnailSize = "small" | "medium" | "large";

export function StoryboardTab({
  chapters,
  panels,
  onPanelDoubleClick,
  onGeneratePanels,
}: StoryboardTabProps) {
  const [thumbnailSize, setThumbnailSize] = useState<ThumbnailSize>("medium");
  const [selectedPanelIds, setSelectedPanelIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // 排序章节
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.chapter_order - b.chapter_order),
    [chapters]
  );

  // 获取选中的分镜信息
  const selectedPanel = useMemo(() => {
    if (selectedPanelIds.size === 1) {
      const panelId = Array.from(selectedPanelIds)[0];
      return panels.find((p) => p.id === panelId) || null;
    }
    return null;
  }, [selectedPanelIds, panels]);

  // 处理分镜点击（支持多选）
  const handlePanelClick = useCallback(
    (panelId: string, event: React.MouseEvent) => {
      const clickedPanel = panels.find((p) => p.id === panelId);
      if (!clickedPanel) return;

      const chapterPanels = panels
        .filter((p) => p.chapter_id === clickedPanel.chapter_id)
        .sort((a, b) => (a.panel_order || 0) - (b.panel_order || 0));

      if (event.shiftKey && lastSelectedId) {
        // Shift+点击：范围选择
        const lastIndex = chapterPanels.findIndex((p) => p.id === lastSelectedId);
        const currentIndex = chapterPanels.findIndex((p) => p.id === panelId);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = chapterPanels.slice(start, end + 1).map((p) => p.id);

          setSelectedPanelIds((prev) => {
            const newSet = new Set(prev);
            rangeIds.forEach((id) => newSet.add(id));
            return newSet;
          });
        }
      } else if (event.metaKey || event.ctrlKey) {
        // Cmd/Ctrl+点击：切换选择
        setSelectedPanelIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(panelId)) {
            newSet.delete(panelId);
          } else {
            newSet.add(panelId);
          }
          return newSet;
        });
        setLastSelectedId(panelId);
      } else {
        // 普通点击：单选
        setSelectedPanelIds(new Set([panelId]));
        setLastSelectedId(panelId);
      }
    },
    [panels, lastSelectedId]
  );

  // 处理双击跳转
  const handlePanelDoubleClickInternal = useCallback(
    (panelId: string) => {
      const panel = panels.find((p) => p.id === panelId);
      if (panel?.chapter_id) {
        onPanelDoubleClick(panelId, panel.chapter_id);
      }
    },
    [panels, onPanelDoubleClick]
  );

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          共 {chapters.length} 章 · {panels.length} 个分镜
          {selectedPanelIds.size > 0 && (
            <span className="ml-2 text-primary">
              · 已选 {selectedPanelIds.size} 个
            </span>
          )}
        </div>

        <StoryboardZoomControl
          size={thumbnailSize}
          onSizeChange={setThumbnailSize}
        />
      </div>

      {/* 章节列表 */}
      <div className="space-y-3">
        {sortedChapters.map((chapter) => (
          <StoryboardChapterSection
            key={chapter.id}
            chapter={chapter}
            panels={panels}
            thumbnailSize={thumbnailSize}
            selectedPanelIds={selectedPanelIds}
            onPanelClick={handlePanelClick}
            onPanelDoubleClick={handlePanelDoubleClickInternal}
            onAddPanel={
              onGeneratePanels ? () => onGeneratePanels(chapter.id) : undefined
            }
          />
        ))}
      </div>

      {/* 选中分镜信息面板 */}
      {selectedPanel && (
        <StoryboardPanelInfo panel={selectedPanel} />
      )}

      {/* 空状态 */}
      {chapters.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          暂无章节，请先创建章节
        </div>
      )}
    </div>
  );
}

export { StoryboardThumbnail } from "./StoryboardThumbnail";
export { StoryboardChapterSection } from "./StoryboardChapterSection";
export { StoryboardZoomControl } from "./StoryboardZoomControl";
