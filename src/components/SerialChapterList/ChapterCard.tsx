/**
 * 单个章节卡片组件
 * 包含展开后的完整分镜编辑功能
 */

"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Edit2,
} from "lucide-react";
import { ChapterPanelEditor } from "./ChapterPanelEditor";
import type { ChapterCardProps } from "./types";

function getStatusBadge(status: string) {
  const variants = {
    draft: { label: "草稿", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    published: { label: "已发布", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    archived: { label: "已归档", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  };

  const variant = variants[status as keyof typeof variants] || variants.draft;

  return (
    <Badge variant="outline" className={variant.color}>
      {variant.label}
    </Badge>
  );
}

export function ChapterCard({
  chapter,
  panels,
  stats,
  isSelected,
  isExpanded,
  showCheckbox,
  onToggleExpand,
  onToggleSelect,
  onEdit,
  onGeneratePanels,
  // 分镜编辑相关
  projectId,
  storyId,
  characters,
  charactersLoading = false,
  isGeneratingPanels = false,
  streamingPanels = [],
  onDeletePanel,
  onImageGenerated,
  onCharactersRefresh,
  onRefresh,
  onError,
}: ChapterCardProps) {
  return (
    <div
      className={`border rounded-lg overflow-hidden transition-colors ${
        isSelected
          ? "border-blue-500 bg-blue-500/5"
          : "border-gray-800/50 bg-[#1a1a1f]/60"
      }`}
    >
      {/* 章节头部 - 可点击展开 */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-800/20 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-3">
          {/* 展开/折叠图标 */}
          <button
            className="mt-1 text-gray-400 hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>

          {/* 复选框 */}
          {showCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 border-gray-600"
            />
          )}

          {/* 章节信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500">第{chapter.chapter_order}章</span>
              {getStatusBadge(chapter.publish_status || "draft")}
            </div>
            <h4 className="font-semibold text-white text-lg mb-2">
              {chapter.title}
            </h4>

            {chapter.summary && !isExpanded && (
              <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                {chapter.summary}
              </p>
            )}

            {/* 统计信息 */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>共 {stats.panelCount} 个分镜</span>
              <span>•</span>
              <span>{stats.generatedCount} 张图片</span>
            </div>

            {stats.panelCount > 0 && (
              <div className="mt-2">
                <div className="flex items-center text-xs text-gray-500 mb-1">
                  <span>图片生成进度</span>
                  <span className="ml-auto">{Math.round(stats.progress)}%</span>
                </div>
                <Progress value={stats.progress} className="h-1.5 bg-gray-800" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 展开的分镜内容 */}
      {isExpanded && (
        <div className="border-t border-gray-800/50 bg-[#16161a]/80">
          <div className="p-4">
            {/* 章节操作按钮 */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {stats.panelCount === 0 ? (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGeneratePanels();
                  }}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  <Layers className="w-4 h-4 mr-1" />
                  AI 生成分镜
                </Button>
              ) : null}

              {/* 编辑章节按钮 */}
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="border-gray-700 text-gray-400 hover:bg-gray-800"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                编辑章节
              </Button>
            </div>

            {/* 内联分镜编辑器 */}
            <ChapterPanelEditor
              chapterId={chapter.id}
              panels={panels}
              projectId={projectId}
              storyId={storyId}
              characters={characters}
              charactersLoading={charactersLoading}
              isGeneratingPanels={isGeneratingPanels}
              streamingPanels={streamingPanels}
              onGeneratePanels={onGeneratePanels}
              onDeletePanel={onDeletePanel}
              onImageGenerated={onImageGenerated}
              onCharactersRefresh={onCharactersRefresh}
              onRefresh={onRefresh}
              onError={onError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
