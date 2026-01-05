/**
 * 脚本页面头部组件
 * 包含标题、操作按钮和统计信息
 */

"use client";

import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, FileText, Maximize2 } from "lucide-react";
import { useMemo } from "react";

interface Chapter {
  id: string;
  published_at?: string | null;
}

interface Panel {
  id: string;
  chapter_id: string;
  generated_image?: string;
  image_url?: string | null;
}

interface ScriptPageHeaderProps {
  title: string;
  chapters: Chapter[];
  panels: Panel[];
  onCreateChapter: () => void;
  onImportText: () => void;
  onEnterFocusMode?: () => void;
}

export function ScriptPageHeader({
  title,
  chapters,
  panels,
  onCreateChapter,
  onImportText,
  onEnterFocusMode,
}: ScriptPageHeaderProps) {
  const stats = useMemo(() => {
    const publishedCount = chapters.filter((ch) => ch.published_at).length;
    const completedPanels = panels.filter((p) => p.generated_image || p.image_url).length;
    const completionRate =
      panels.length > 0 ? Math.round((completedPanels / panels.length) * 100) : 0;

    // 计算完成的章节数（该章节的所有分镜都有图像）
    const completedChapters = chapters.filter((chapter) => {
      const chapterPanels = panels.filter((p) => p.chapter_id === chapter.id);
      if (chapterPanels.length === 0) return false;
      return chapterPanels.every((p) => p.generated_image || p.image_url);
    }).length;

    return {
      publishedCount,
      completedPanels,
      completedChapters,
      completionRate,
    };
  }, [chapters, panels]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-500 to-purple-500 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* 专注模式按钮 - 仅在有分镜时显示 */}
          {panels.length > 0 && onEnterFocusMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEnterFocusMode}
              className="border-purple-500/50 hover:border-purple-500 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              专注编辑
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onImportText}
            className="border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white"
          >
            <FileText className="w-4 h-4 mr-2" />
            导入文本
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 hover:border-gray-600 text-orange-500 hover:text-orange-400"
          >
            AI 续写
          </Button>
          <Button
            size="sm"
            onClick={onCreateChapter}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            + 创建章节
          </Button>
        </div>
      </div>

      {/* 统计信息卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {/* 章节统计 */}
        <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">章节进度</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats.completedChapters}</span>
            <span className="text-sm text-gray-400">/ {chapters.length}</span>
          </div>
        </div>

        {/* 分镜统计 */}
        <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">分镜进度</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats.completedPanels}</span>
            <span className="text-sm text-gray-400">/ {panels.length}</span>
          </div>
        </div>

        {/* 完成度 */}
        <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">完成度</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-orange-400">
              {stats.completionRate}%
            </span>
            {stats.completionRate > 0 && (
              <TrendingUp className="w-4 h-4 text-green-400" />
            )}
          </div>
        </div>

        {/* 已发布 */}
        <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">已发布</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats.publishedCount}</span>
            <span className="text-sm text-gray-400">章</span>
          </div>
        </div>
      </div>
    </div>
  );
}
