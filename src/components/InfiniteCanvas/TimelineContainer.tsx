"use client";

import { useState, useCallback } from "react";
import { Plus, Play, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapterRow } from "./ChapterRow";
import type { CanvasTimeline, TimelineChapter } from "./types";

interface TimelineContainerProps {
  timeline: CanvasTimeline;
  onRefresh: () => void;
}

export function TimelineContainer({
  timeline,
  onRefresh,
}: TimelineContainerProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateChapterStep = useCallback(
    async (chapterId: string, step: string) => {
      try {
        const response = await fetch(
          `/api/canvas/chapter/${chapterId}/${step}`,
          { method: "POST" }
        );
        if (!response.ok) {
          throw new Error("生成失败");
        }
        onRefresh();
      } catch (error) {
        console.error(`生成${step}失败:`, error);
      }
    },
    [onRefresh]
  );

  const generateAll = useCallback(async () => {
    setIsGenerating(true);
    try {
      for (const chapter of timeline.chapters || []) {
        if (chapter.script_status !== "completed") {
          await generateChapterStep(chapter.id, "generate-script");
        }
        if (chapter.shot_status !== "completed") {
          await generateChapterStep(chapter.id, "generate-shots");
        }
        if (chapter.scene_status !== "completed") {
          await generateChapterStep(chapter.id, "generate-scenes");
        }
        if (chapter.final_status !== "completed") {
          await generateChapterStep(chapter.id, "generate-finals");
        }
      }
    } finally {
      setIsGenerating(false);
    }
  }, [timeline.chapters, generateChapterStep]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-white">{timeline.title}</h1>
          <p className="text-sm text-gray-400">
            {timeline.completed_chapters}/{timeline.total_chapters} 章节完成 |{" "}
            {timeline.total_shots} 镜头 | {timeline.total_images} 图片
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-1" />
            设置
          </Button>
          <Button
            onClick={generateAll}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Play className="w-4 h-4 mr-1" />
            {isGenerating ? "生成中..." : "全部生成"}
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        {timeline.chapters && timeline.chapters.length > 0 ? (
          timeline.chapters.map((chapter: TimelineChapter) => (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              onGenerateScript={() =>
                generateChapterStep(chapter.id, "generate-script")
              }
              onGenerateShots={() =>
                generateChapterStep(chapter.id, "generate-shots")
              }
              onGenerateScenes={() =>
                generateChapterStep(chapter.id, "generate-scenes")
              }
              onGenerateFinals={() =>
                generateChapterStep(chapter.id, "generate-finals")
              }
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Plus className="w-12 h-12 mb-4" />
            <p>暂无章节，请先添加章节</p>
          </div>
        )}
      </div>
    </div>
  );
}
