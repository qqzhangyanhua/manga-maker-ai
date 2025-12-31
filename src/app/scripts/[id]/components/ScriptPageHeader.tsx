/**
 * 脚本页面头部组件
 * 包含标题、操作按钮和统计信息
 */

"use client";

import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

interface Chapter {
  id: string;
  published_at?: string | null;
}

interface Panel {
  id: string;
  generated_image?: string;
}

interface ScriptPageHeaderProps {
  title: string;
  chapters: Chapter[];
  panels: Panel[];
  onCreateChapter: () => void;
}

export function ScriptPageHeader({
  title,
  chapters,
  panels,
  onCreateChapter,
}: ScriptPageHeaderProps) {
  const publishedCount = chapters.filter((ch) => ch.published_at).length;
  const imageCount = panels.filter((p) => p.generated_image).length;

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
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 hover:border-gray-600 text-orange-500 hover:text-orange-400"
          >
            <span className="mr-1">✨</span> AI 续写
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

      {/* 统计信息 */}
      <div className="flex items-center gap-6 text-sm text-gray-400">
        <span>共 {chapters.length} 章</span>
        <span>•</span>
        <span>已发布 {publishedCount} 章</span>
        <span>•</span>
        <span>{panels.length} 个分镜</span>
        <span>•</span>
        <span>{imageCount} 张图片</span>
      </div>
    </div>
  );
}
