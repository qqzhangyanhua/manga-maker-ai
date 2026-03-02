import { useMemo } from "react";

export type CreationStage = "empty" | "chapter_created" | "generating" | "ready_to_export";

/** 进度计算所需的最小章节类型 */
export interface Chapter {
  id: string;
}

/** 进度计算所需的最小分镜类型 */
export interface Panel {
  id: string;
  chapter_id?: string;
  image_url?: string | null;
}

export interface ProgressCalculationResult {
  // 章节统计
  totalChapters: number;
  completedChapters: number;

  // 分镜统计
  totalPanels: number;
  completedPanels: number;
  pendingPanels: number;

  // 完成度
  completionRate: number; // 0-100

  // 预估时间
  estimatedMinutes: number;

  // 当前阶段
  stage: CreationStage;
  stageLabel: string;
}

export interface UseProgressCalculationOptions {
  chapters: Chapter[];
  panels: Panel[];
  timePerPanel?: number; // 每个分镜生成时间（分钟），默认0.5
}

function getStage(
  chaptersCount: number,
  panelsCount: number,
  completedCount: number
): CreationStage {
  if (chaptersCount === 0) return "empty";
  if (panelsCount === 0) return "chapter_created";
  if (completedCount < panelsCount) return "generating";
  return "ready_to_export";
}

function getStageLabel(stage: CreationStage): string {
  switch (stage) {
    case "empty":
      return "未开始";
    case "chapter_created":
      return "章节已创建";
    case "generating":
      return "分镜生成中";
    case "ready_to_export":
      return "可以导出";
  }
}

export function useProgressCalculation({
  chapters,
  panels,
  timePerPanel = 0.5,
}: UseProgressCalculationOptions): ProgressCalculationResult {
  return useMemo(() => {
    const totalChapters = chapters.length;
    const totalPanels = panels.length;
    const completedPanels = panels.filter((p) => p.image_url).length;
    const pendingPanels = totalPanels - completedPanels;

    // 计算完成的章节数（该章节的所有分镜都有图像）
    const completedChapters = chapters.filter((chapter) => {
      const chapterPanels = panels.filter((p) => p.chapter_id === chapter.id);
      if (chapterPanels.length === 0) return false;
      return chapterPanels.every((p) => p.image_url);
    }).length;

    // 完成度百分比
    const completionRate =
      totalPanels > 0 ? Math.round((completedPanels / totalPanels) * 100) : 0;

    // 预估剩余时间
    const estimatedMinutes = Math.ceil(pendingPanels * timePerPanel);

    // 当前阶段
    const stage = getStage(totalChapters, totalPanels, completedPanels);
    const stageLabel = getStageLabel(stage);

    return {
      totalChapters,
      completedChapters,
      totalPanels,
      completedPanels,
      pendingPanels,
      completionRate,
      estimatedMinutes,
      stage,
      stageLabel,
    };
  }, [chapters, panels, timePerPanel]);
}
