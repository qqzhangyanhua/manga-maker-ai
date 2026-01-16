"use client";

import { useState, useCallback } from "react";
import { Plus, Play, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapterRow } from "./ChapterRow";
import { TimelineSettings } from "./TimelineSettings";
import { AddChapterDialog } from "./AddChapterDialog";
import type { CanvasTimeline, TimelineChapter, CanvasTimelineConfig } from "./types";

interface TimelineContainerProps {
  timeline: CanvasTimeline;
  onRefresh: () => void;
}

export function TimelineContainer({
  timeline,
  onRefresh,
}: TimelineContainerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);

  const handleSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleAddChapter = useCallback(() => {
    setShowAddChapter(true);
  }, []);

  const generateChapterStep = useCallback(
    async (chapterId: string, step: string) => {
      console.log(`开始生成章节步骤: ${chapterId}, 步骤: ${step}`);
      try {
        const response = await fetch(
          `/api/canvas/chapter/${chapterId}/${step}`,
          { method: "POST" }
        );
        if (!response.ok) {
          throw new Error("生成失败");
        }
        console.log(`章节步骤生成成功: ${step}`);
        onRefresh();
      } catch (error) {
        console.error(`生成${step}失败:`, error);
      }
    },
    [onRefresh]
  );

  const generateAll = useCallback(async () => {
    console.log("开始全部生成流程");
    setIsGenerating(true);
    try {
      for (const chapter of timeline.chapters || []) {
        console.log(`处理章节: ${chapter.id}, 章节号: ${chapter.chapter_number}`);
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
      console.log("全部生成流程完成");
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
          <Button variant="outline" size="sm" onClick={handleAddChapter}>
            <Plus className="w-4 h-4 mr-1" />
            添加章节
          </Button>
          <Button variant="outline" size="sm" onClick={handleSettings}>
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
            <p className="mb-4">暂无章节，请先添加章节</p>
            <Button onClick={handleAddChapter} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              添加章节
            </Button>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <TimelineSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        timelineId={timeline.id}
        currentConfig={timeline.config as CanvasTimelineConfig}
        onSaved={onRefresh}
      />

      {/* Add Chapter Dialog */}
      <AddChapterDialog
        open={showAddChapter}
        onClose={() => setShowAddChapter(false)}
        timelineId={timeline.id}
        onAdded={onRefresh}
      />
    </div>
  );
}
