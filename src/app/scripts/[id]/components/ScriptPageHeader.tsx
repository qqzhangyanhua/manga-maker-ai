/**
 * 脚本页面头部组件
 * 包含标题、操作按钮和统计信息
 */

"use client";

import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, FileText, Maximize2, Grid3x3, Wand2 } from "lucide-react";
import { useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import type { ScriptPageHeaderProps } from "../types/component-props.types";

export function ScriptPageHeader({
  title,
  chapters,
  panels,
  onCreateChapter,
  onImportText,
  onEnterFocusMode,
  onOpenNineGrid,
}: ScriptPageHeaderProps) {
  const stats = useMemo(() => {
    const publishedCount = chapters.filter((ch) => ch.published_at).length;
    const completedPanels = panels.filter((p) => p.generated_image || p.image_url).length;
    const completionRate =
      panels.length > 0 ? Math.round((completedPanels / panels.length) * 100) : 0;

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
    <div className="mb-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{title}</h1>
        </div>

        {/* ✅ 优化后的按钮布局：主要操作 + 次要操作 */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 🎯 主要操作区（根据状态动态显示） */}
          <div className="flex items-center gap-2">
            {/* 无章节时：突出显示创建章节 */}
            {chapters.length === 0 ? (
              <Button
                size="default"
                onClick={onCreateChapter}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                创建第一章
              </Button>
            ) : (
              <>
                {/* 有章节时：批量生成分镜作为主操作 */}
                {onOpenNineGrid && (
                  <Button
                    size="default"
                    onClick={onOpenNineGrid}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/20"
                  >
                    <Grid3x3 className="w-4 h-4 mr-2" />
                    批量生成分镜
                  </Button>
                )}
                {/* 创建更多章节（次要） */}
                <Button
                  variant="outline"
                  size="default"
                  onClick={onCreateChapter}
                  className="border-orange-500/30 hover:border-orange-500 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 bg-orange-500/5"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  新增章节
                </Button>
              </>
            )}
          </div>

          {/* 分隔线 */}
          {chapters.length > 0 && (
            <div className="w-px h-6 bg-zinc-700/50" />
          )}

          {/* 📎 次要操作区 */}
          <div className="flex items-center gap-2">
            {/* 专注模式 - 仅在有分镜时显示 */}
            {panels.length > 0 && onEnterFocusMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEnterFocusMode}
                className="border-purple-500/30 hover:border-purple-500 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 bg-purple-500/5"
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                专注编辑
              </Button>
            )}

            {/* 导入文本 */}
            <Button
              variant="outline"
              size="sm"
              onClick={onImportText}
              className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              导入文本
            </Button>
          </div>
        </div>
      </div>

      {/* 统计信息卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 章节统计 */}
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center hover:bg-zinc-900/60 transition-colors">
          <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">章节进度</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{stats.completedChapters}</span>
            <span className="text-sm text-zinc-500">/ {chapters.length}</span>
          </div>
        </GlassCard>

        {/* 分镜统计 */}
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center hover:bg-zinc-900/60 transition-colors">
          <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">分镜进度</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{stats.completedPanels}</span>
            <span className="text-sm text-zinc-500">/ {panels.length}</span>
          </div>
        </GlassCard>

        {/* 完成度 */}
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center hover:bg-zinc-900/60 transition-colors border-orange-500/20">
          <div className="text-xs text-orange-500/80 mb-1 uppercase tracking-wider">完成度</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-orange-400">
              {stats.completionRate}%
            </span>
            {stats.completionRate > 0 && (
              <TrendingUp className="w-4 h-4 text-green-400" />
            )}
          </div>
        </GlassCard>

        {/* 已发布 */}
        <GlassCard className="p-4 flex flex-col items-center justify-center text-center hover:bg-zinc-900/60 transition-colors">
          <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">已发布</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{stats.publishedCount}</span>
            <span className="text-sm text-zinc-500">章</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
