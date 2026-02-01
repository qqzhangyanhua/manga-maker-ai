/**
 * 故事板章节区块
 * 显示单个章节的所有分镜缩略图
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StoryboardThumbnail } from "./StoryboardThumbnail";
import type { Panel } from "../../types/script-editor.types";

interface Chapter {
  id: string;
  title: string;
  chapter_order: number;
}

interface StoryboardChapterSectionProps {
  chapter: Chapter;
  panels: Panel[];
  thumbnailSize: "small" | "medium" | "large";
  selectedPanelIds: Set<string>;
  onPanelClick: (panelId: string, event: React.MouseEvent) => void;
  onPanelDoubleClick: (panelId: string) => void;
  onAddPanel?: () => void;
}

export function StoryboardChapterSection({
  chapter,
  panels,
  thumbnailSize,
  selectedPanelIds,
  onPanelClick,
  onPanelDoubleClick,
  onAddPanel,
}: StoryboardChapterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const chapterPanels = panels
    .filter((p) => p.chapter_id === chapter.id)
    .sort((a, b) => (a.panel_order || 0) - (b.panel_order || 0));

  return (
    <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden">
      {/* 章节标题栏 */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-sm text-gray-400">第{chapter.chapter_order}章</span>
          <span className="font-medium text-white">{chapter.title}</span>
          <span className="text-xs text-gray-500">({chapterPanels.length})</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
          className="text-gray-400 hover:text-white"
        >
          {isExpanded ? "收起" : "展开"}
        </Button>
      </div>

      {/* 缩略图网格 */}
      {isExpanded && (
        <div className="p-4 pt-0">
          <div className="flex flex-wrap gap-2">
            {chapterPanels.map((panel, index) => (
              <StoryboardThumbnail
                key={panel.id}
                panel={panel}
                index={index}
                size={thumbnailSize}
                isSelected={selectedPanelIds.has(panel.id)}
                onClick={() => onPanelClick(panel.id, {} as React.MouseEvent)}
                onDoubleClick={() => onPanelDoubleClick(panel.id)}
              />
            ))}

            {/* 添加分镜按钮 */}
            {onAddPanel && (
              <button
                onClick={onAddPanel}
                className={cn(
                  "flex items-center justify-center rounded-lg",
                  "border-2 border-dashed border-gray-700 hover:border-gray-500",
                  "bg-gray-800/30 hover:bg-gray-800/50 transition-colors",
                  thumbnailSize === "small" && "w-[60px] h-[60px]",
                  thumbnailSize === "medium" && "w-[100px] h-[100px]",
                  thumbnailSize === "large" && "w-[160px] h-[160px]"
                )}
              >
                <Plus className="w-6 h-6 text-gray-500" />
              </button>
            )}
          </div>

          {chapterPanels.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              暂无分镜
            </div>
          )}
        </div>
      )}
    </div>
  );
}
