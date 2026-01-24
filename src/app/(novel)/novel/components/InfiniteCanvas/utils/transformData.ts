/**
 * 数据转换工具 - 将 TimelineChapter 转换为 React Flow 节点
 */
import type { Node, Edge } from 'reactflow';
import type {
  CanvasTimeline,
  PaginatedTimeline,
  TimelineChapter,
  GenerationStatus,
  ChapterSummary,
} from '../types';

type TimelineData = CanvasTimeline | PaginatedTimeline;

// 节点布局常量
const LAYOUT = {
  LANE_HEIGHT: 280,      // 每个泳道的高度
  LANE_PADDING: 40,      // 泳道间距
  NODE_WIDTH: 200,       // 节点宽度
  NODE_HEIGHT: 220,      // 节点高度
  NODE_GAP: 80,          // 节点间距
  CHAPTER_WIDTH: 180,    // 章节卡片宽度
};

/**
 * 计算章节进度（0-100）
 */
export function calculateChapterProgress(chapter: TimelineChapter): number {
  // 权重分配：剧本25%，镜头35%，漫画40%
  const weights = {
    script: 0.25,
    shot: 0.35,
    final: 0.4,
  };

  // 状态分数
  const scores: Record<GenerationStatus, number> = {
    pending: 0,
    generating: 0.5,
    completed: 1,
    error: 0,
  };

  const totalScore =
    scores[chapter.script_status] * weights.script +
    scores[chapter.shot_status] * weights.shot +
    scores[chapter.final_status] * weights.final;

  return Math.round(totalScore * 100);
}

/**
 * 转换 Timeline 数据为 React Flow 节点和边
 */
export function transformTimelineToFlow(timeline: TimelineData): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!timeline.chapters || timeline.chapters.length === 0) {
    return { nodes, edges };
  }

  timeline.chapters.forEach((chapter, laneIndex) => {
    // 计算当前泳道的 Y 坐标
    const laneY = laneIndex * (LAYOUT.LANE_HEIGHT + LAYOUT.LANE_PADDING);

    // 1. 章节入口节点（最左侧）
    const chapterNodeId = `chapter-${chapter.id}`;
    nodes.push({
      id: chapterNodeId,
      type: 'chapterHeader',
      position: { x: 0, y: laneY },
      data: {
        chapterId: chapter.id,
        chapterNumber: chapter.chapter_number,
        progress: calculateChapterProgress(chapter),
        timelineId: chapter.timeline_id,
        characterCount: chapter.character_ids?.length ?? 0,
      },
      draggable: false, // 章节节点不可拖动
    });

    // 2. 剧本节点
    const scriptNodeId = `script-${chapter.id}`;
    nodes.push({
      id: scriptNodeId,
      type: 'script',
      position: {
        x: LAYOUT.CHAPTER_WIDTH + LAYOUT.NODE_GAP,
        y: laneY
      },
      data: {
        chapterId: chapter.id,
        status: chapter.script_status,
        count: chapter.script_segment_count,
        timelineId: chapter.timeline_id,
      },
      draggable: false,
    });
    edges.push({
      id: `e-${chapterNodeId}-${scriptNodeId}`,
      source: chapterNodeId,
      target: scriptNodeId,
      animated: chapter.script_status === 'generating',
      style: {
        stroke: getEdgeColor(chapter.script_status),
        strokeWidth: getEdgeStrokeWidth(chapter.script_status),
      },
    });

    // 3. 镜头节点
    const shotNodeId = `shot-${chapter.id}`;
    const shotX = LAYOUT.CHAPTER_WIDTH + LAYOUT.NODE_GAP +
                  (LAYOUT.NODE_WIDTH + LAYOUT.NODE_GAP);
    nodes.push({
      id: shotNodeId,
      type: 'shot',
      position: { x: shotX, y: laneY },
      data: {
        chapterId: chapter.id,
        status: chapter.shot_status,
        count: chapter.shot_count,
        canGenerate: chapter.script_status === 'completed',
        timelineId: chapter.timeline_id,
      },
      draggable: false,
    });
    edges.push({
      id: `e-${scriptNodeId}-${shotNodeId}`,
      source: scriptNodeId,
      target: shotNodeId,
      animated: chapter.shot_status === 'generating',
      style: {
        stroke: getEdgeColor(chapter.shot_status),
        strokeWidth: getEdgeStrokeWidth(chapter.shot_status),
      },
    });

    // 4. 漫画节点
    const finalNodeId = `final-${chapter.id}`;
    const finalX = LAYOUT.CHAPTER_WIDTH + LAYOUT.NODE_GAP +
                   2 * (LAYOUT.NODE_WIDTH + LAYOUT.NODE_GAP);
    nodes.push({
      id: finalNodeId,
      type: 'final',
      position: { x: finalX, y: laneY },
      data: {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterNumber: chapter.chapter_number,
        status: chapter.final_status,
        count: chapter.final_image_count,
        canGenerate: chapter.shot_status === 'completed',
        timelineId: chapter.timeline_id,
      },
      draggable: false,
    });
    edges.push({
      id: `e-${shotNodeId}-${finalNodeId}`,
      source: shotNodeId,
      target: finalNodeId,
      animated: chapter.final_status === 'generating',
      style: {
        stroke: getEdgeColor(chapter.final_status),
        strokeWidth: getEdgeStrokeWidth(chapter.final_status),
      },
    });
  });

  return { nodes, edges };
}

/**
 * 根据状态获取边的颜色
 */
function getEdgeColor(status: GenerationStatus): string {
  switch (status) {
    case 'pending':
      return '#52525b'; // zinc-600
    case 'generating':
      return '#a855f7'; // purple-500
    case 'completed':
      return '#22c55e'; // green-500
    case 'error':
      return '#ef4444'; // red-500
    default:
      return '#52525b';
  }
}

/**
 * 根据状态获取边的线宽
 */
function getEdgeStrokeWidth(status: GenerationStatus): number {
  return status === 'generating' ? 3 : 2;
}

/**
 * 计算全局进度
 */
export function calculateOverallProgress(timeline: TimelineData): {
  percentage: number;
  completedChapters: number;
  totalChapters: number;
} {
  if (!timeline.chapters || timeline.chapters.length === 0) {
    return { percentage: 0, completedChapters: 0, totalChapters: 0 };
  }

  const totalChapters = timeline.chapters.length;
  const chapterProgresses = timeline.chapters.map(calculateChapterProgress);
  const totalProgress = chapterProgresses.reduce((sum, p) => sum + p, 0);
  const percentage = Math.round(totalProgress / totalChapters);

  const completedChapters = timeline.chapters.filter(
    (ch) => ch.final_status === 'completed'
  ).length;

  return { percentage, completedChapters, totalChapters };
}
