"use client";

/**
 * 章节分镜导航组件
 * 左侧边栏，显示章节列表和分镜缩略图
 */

import { useMemo, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Image as ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Panel } from "@prisma/client";
import type { Chapter } from "@prisma/client";
import { useFocusMode } from "../../contexts/FocusModeContext";

interface ChapterPanelNavProps {
  className?: string;
}

export function ChapterPanelNav({ className }: ChapterPanelNavProps) {
  const { state, actions, panels, chapters } = useFocusMode();
  
  // 展开/收起状态（存储展开的章节 ID）
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() => {
    // 默认展开当前分镜所在的章节
    if (state.currentPanel) {
      return new Set([state.currentPanel.chapter_id]);
    }
    // 如果有章节，展开第一个
    return chapters.length > 0 ? new Set([chapters[0].id]) : new Set();
  });

  // 按章节分组分镜
  const panelsByChapter = useMemo(() => {
    const grouped = new Map<string, Panel[]>();
    
    chapters.forEach((chapter) => {
      const chapterPanels = panels.filter((p) => p.chapter_id === chapter.id);
      grouped.set(chapter.id, chapterPanels);
    });
    
    return grouped;
  }, [panels, chapters]);

  // 获取当前章节
  const currentChapter = useMemo(() => {
    if (!state.currentPanel) return null;
    return chapters.find((ch) => ch.id === state.currentPanel?.chapter_id);
  }, [state.currentPanel, chapters]);
  
  // 切换章节展开/收起
  const toggleChapter = useCallback((chapterId: string) => {
    setExpandedChapters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  }, []);
  
  // 当选择新分镜时，自动展开该章节
  const handlePanelSelect = useCallback((panel: Panel) => {
    actions.selectPanel(panel.id);
    // 确保该章节是展开的（如果有 chapter_id）
    if (panel.chapter_id) {
      setExpandedChapters((prev) => {
        const newSet = new Set(prev);
        newSet.add(panel.chapter_id!); // TypeScript 收窄不够，需要断言
        return newSet;
      });
    }
  }, [actions]);

  return (
    <div className={cn("flex flex-col h-full bg-[#16161a] border-r border-gray-800", className)}>
      {/* 标题 */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">章节分镜</h3>
        <p className="text-xs text-gray-400 mt-1">
          {chapters.length} 个章节 · {panels.length} 个分镜
        </p>
      </div>

      {/* 章节列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {chapters.map((chapter) => {
            const chapterPanels = panelsByChapter.get(chapter.id) || [];
            const isCurrentChapter = currentChapter?.id === chapter.id;
            const isExpanded = expandedChapters.has(chapter.id);
            
            return (
              <div key={chapter.id} className="space-y-2">
                {/* 章节标题 */}
                <button
                  onClick={() => toggleChapter(chapter.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors",
                    isCurrentChapter
                      ? "bg-orange-500/10 text-orange-400"
                      : "text-gray-400 hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight className={cn(
                      "w-4 h-4 flex-shrink-0 transition-transform",
                      isExpanded && "rotate-90"
                    )} />
                    <span className="text-xs font-medium truncate">
                      第 {chapter.chapter_order} 章
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {chapterPanels.length}
                  </Badge>
                </button>

                {/* 分镜列表 - 只在展开时显示 */}
                {isExpanded && (
                  <div className="pl-6 space-y-2">
                    {chapterPanels.map((panel) => {
                      const isSelected = state.currentPanelId === panel.id;
                      const hasImage = !!panel.generated_image;

                      return (
                        <button
                          key={panel.id}
                          onClick={() => handlePanelSelect(panel)}
                          className={cn(
                            "w-full flex items-start gap-3 p-2 rounded-lg text-left transition-all",
                            isSelected
                              ? "bg-orange-500/20 border-2 border-orange-500"
                              : "bg-white/5 hover:bg-white/10 border-2 border-transparent"
                          )}
                        >
                          {/* 缩略图 */}
                          <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-900">
                            {hasImage ? (
                              <img
                                src={panel.generated_image!}
                                alt={`分镜 ${panel.panel_order}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-gray-600" />
                              </div>
                            )}

                            {/* 序号徽章 */}
                            <div className="absolute top-1 left-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                              {panel.panel_order}
                            </div>

                            {/* 生成中状态 - Panel 模型没有 image_generation_status，用 prompt_used 判断 */}
                            {panel.prompt_used && !panel.generated_image && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
                              </div>
                            )}
                          </div>

                          {/* 描述文本 */}
                          <div className="flex-1 min-w-0 pt-1">
                            <p className={cn(
                              "text-xs line-clamp-3",
                              isSelected ? "text-white" : "text-gray-400"
                            )}>
                              {panel.description || "无描述"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* 底部统计 */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            已生成: {panels.filter((p) => p.generated_image).length}/{panels.length}
          </span>
          {state.currentPanel && (
            <span className="text-orange-400">
              #{state.currentPanel.panel_order}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

