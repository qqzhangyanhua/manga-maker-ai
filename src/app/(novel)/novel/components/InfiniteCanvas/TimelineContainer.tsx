"use client";

import { useState, useCallback } from "react";
import { Plus, Play, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapterRow } from "./ChapterRow";
import { TimelineSettings } from "./TimelineSettings";
import { AddChapterDialog } from "./AddChapterDialog";
import { GenerateSceneDialog } from "./GenerateSceneDialog";
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
  const [sceneDialogChapter, setSceneDialogChapter] = useState<TimelineChapter | null>(null);

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
    <div className="flex flex-col h-full bg-[#0f0f13]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#0f0f13]/80 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{timeline.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center text-xs text-zinc-400 bg-zinc-900/50 px-2 py-0.5 rounded-full border border-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
              {timeline.completed_chapters}/{timeline.total_chapters} 章节完成
            </span>
            <span className="text-xs text-zinc-500">|</span>
            <span className="text-xs text-zinc-400">
              {timeline.total_shots} 镜头
            </span>
            <span className="text-xs text-zinc-500">|</span>
            <span className="text-xs text-zinc-400">
              {timeline.total_images} 图片
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddChapter}
            className="border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            添加章节
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSettings}
            className="border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4 mr-1.5" />
            设置
          </Button>
          <Button
            onClick={generateAll}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20 transition-all hover:scale-105 active:scale-95"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-1.5 fill-current" />
            )}
            {isGenerating ? "生成中..." : "全部生成"}
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {timeline.chapters && timeline.chapters.length > 0 ? (
          <div className="space-y-4">
            {timeline.chapters.map((chapter: TimelineChapter, index: number) => (
              <ChapterRow
                key={`${chapter.id}-${index}`}
                chapter={chapter}
                onGenerateScript={() =>
                  generateChapterStep(chapter.id, "generate-script")
                }
                onGenerateShots={() =>
                  generateChapterStep(chapter.id, "generate-shots")
                }
                onGenerateScenes={() => setSceneDialogChapter(chapter)}
                onGenerateFinals={() =>
                  generateChapterStep(chapter.id, "generate-finals")
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-2xl bg-zinc-900/50 border-2 border-dashed border-zinc-800 flex items-center justify-center mb-6 shadow-xl shadow-black/20">
              <Plus className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">开始你的创作</h3>
            <p className="mb-8 text-sm max-w-xs text-center leading-relaxed">
              暂无章节内容。添加第一章开始生成剧本、分镜和最终画面。
            </p>
            <Button 
              onClick={handleAddChapter} 
              className="bg-zinc-100 text-zinc-900 hover:bg-white transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              立即添加章节
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
        novelProjectId={timeline.novel_project_id}
        projectTitle={timeline.title}
        onAdded={onRefresh}
      />

      {/* Generate Scene Dialog */}
      {sceneDialogChapter && (
        <GenerateSceneDialog
          open={!!sceneDialogChapter}
          onOpenChange={(open) => !open && setSceneDialogChapter(null)}
          chapterId={sceneDialogChapter.id}
          chapterTitle={sceneDialogChapter.title}
          chapterNumber={sceneDialogChapter.chapter_number}
          timelineId={timeline.id}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
