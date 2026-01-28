/**
 * 生成进度显示组件
 *
 * 功能:
 * 1. 显示当前正在生成的章节和阶段
 * 2. 显示生成进度条
 * 3. 支持取消生成
 */

"use client";

import { useMemo, useState } from "react";
import { X, Loader2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { CanvasTimeline, PaginatedTimeline } from "./types";

interface GenerationProgressProps {
  timeline: CanvasTimeline | PaginatedTimeline;
}

interface GeneratingChapterLocal {
  chapterId: string;
  chapterNumber: number;
  stage: "script" | "shot" | "final";
  stageName: string;
}

const STAGE_NAMES = {
  script: "剧本分析",
  shot: "镜头规划",
  final: "漫画合成",
} as const;

const STAGE_COLORS = {
  script: "from-purple-500 to-purple-600",
  shot: "from-blue-500 to-blue-600",
  final: "from-pink-500 to-pink-600",
} as const;

export function GenerationProgress({
  timeline,
}: GenerationProgressProps) {
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // 找出所有正在生成的章节和阶段
  const generatingChapters = useMemo((): GeneratingChapterLocal[] => {
    if (!timeline.chapters) return [];

    const generating: GeneratingChapterLocal[] = [];

    timeline.chapters.forEach((chapter) => {
      if (chapter.script_status === "generating") {
        generating.push({
          chapterId: chapter.id,
          chapterNumber: chapter.chapter_number,
          stage: "script",
          stageName: STAGE_NAMES.script,
        });
      }
      if (chapter.shot_status === "generating") {
        generating.push({
          chapterId: chapter.id,
          chapterNumber: chapter.chapter_number,
          stage: "shot",
          stageName: STAGE_NAMES.shot,
        });
      }
      if (chapter.final_status === "generating") {
        generating.push({
          chapterId: chapter.id,
          chapterNumber: chapter.chapter_number,
          stage: "final",
          stageName: STAGE_NAMES.final,
        });
      }
    });

    return generating;
  }, [timeline.chapters]);

  // 取消单个章节的生成任务
  const handleCancelChapter = async (chapterId: string) => {
    setCancellingIds((prev) => new Set(prev).add(chapterId));

    try {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "取消失败");
      }

      const result = await response.json();

      // 乐观更新：立即将状态改为 pending
      queryClient.setQueriesData(
        { queryKey: ["timeline", timeline.id] },
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const data = old as { chapters?: Array<{ id: string; script_status: string; shot_status: string; final_status: string }> };
          if (!data.chapters) return old;
          return {
            ...data,
            chapters: data.chapters.map((ch) => {
              if (ch.id !== chapterId) return ch;
              const updated = { ...ch };
              if (result.cancelledStages?.includes("script")) updated.script_status = "pending";
              if (result.cancelledStages?.includes("shot")) updated.shot_status = "pending";
              if (result.cancelledStages?.includes("final")) updated.final_status = "pending";
              return updated;
            }),
          };
        }
      );

      // 刷新数据确保与数据库同步
      await queryClient.refetchQueries({ queryKey: ["timeline", timeline.id] });

      toast.success("已取消生成任务");
    } catch (error) {
      toast.error("取消失败", {
        description: error instanceof Error ? error.message : "请重试",
      });
    } finally {
      setCancellingIds((prev) => {
        const next = new Set(prev);
        next.delete(chapterId);
        return next;
      });
    }
  };

  // 取消所有正在进行的任务
  const handleCancelAll = async () => {
    const uniqueChapterIds = [...new Set(generatingChapters.map((c) => c.chapterId))];

    await Promise.allSettled(
      uniqueChapterIds.map((chapterId) => handleCancelChapter(chapterId))
    );
  };

  // 如果没有正在生成的，不显示
  if (generatingChapters.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl shadow-2xl p-4 min-w-[320px] max-w-[500px]">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            <span className="text-sm font-medium text-white">
              正在生成 ({generatingChapters.length})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelAll}
            className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <StopCircle className="w-3.5 h-3.5 mr-1" />
            全部取消
          </Button>
        </div>

        {/* 生成任务列表 */}
        <div className="space-y-2">
          {generatingChapters.map((item) => {
            const isCancelling = cancellingIds.has(item.chapterId);

            return (
              <div
                key={`${item.chapterId}-${item.stage}`}
                className="bg-zinc-800/50 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-400">
                    第 {item.chapterNumber} 章
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">
                      {item.stageName}
                    </span>
                    <button
                      onClick={() => handleCancelChapter(item.chapterId)}
                      disabled={isCancelling}
                      className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="取消此任务"
                    >
                      {isCancelling ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                {/* 进度条 */}
                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${STAGE_COLORS[item.stage]} animate-pulse`}
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 提示 */}
        <p className="text-[10px] text-zinc-500 mt-3 text-center">
          生成过程中请勿关闭页面
        </p>
      </div>
    </div>
  );
}
