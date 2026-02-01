"use client";

import { memo, useMemo } from 'react';
import { Wifi, WifiOff, CheckSquare, Zap, Settings, Plus, Users, FileText, Camera, Image } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvas-store';
import { GlobalActions } from './GlobalActions';
import type { PaginatedTimeline, GenerationStatus } from './types';

interface TopProgressPanelProps {
  timeline: PaginatedTimeline;
  progress: {
    completedChapters: number;
    totalChapters: number;
    percentage: number;
  };
  onOpenSettings: () => void;
  onOpenAddChapter: () => void;
  onOpenCharacterDrawer: () => void;
}

/**
 * P3-4: 计算各阶段的进度统计
 */
interface StageProgress {
  completed: number;
  generating: number;
  pending: number;
  error: number;
  total: number;
}

function calculateStageProgress(
  chapters: PaginatedTimeline['chapters'],
  statusKey: 'script_status' | 'shot_status' | 'final_status'
): StageProgress {
  const result: StageProgress = {
    completed: 0,
    generating: 0,
    pending: 0,
    error: 0,
    total: chapters.length,
  };
  
  for (const chapter of chapters) {
    const status = chapter[statusKey] as GenerationStatus;
    if (status === 'completed') result.completed++;
    else if (status === 'generating') result.generating++;
    else if (status === 'error') result.error++;
    else result.pending++;
  }
  
  return result;
}

/**
 * 顶部进度面板 - 独立组件，自己订阅 store 状态
 * 避免 store 变化导致整个 ReactFlow 重渲染
 */
export const TopProgressPanel = memo(function TopProgressPanel({
  timeline,
  progress,
  onOpenSettings,
  onOpenAddChapter,
  onOpenCharacterDrawer,
}: TopProgressPanelProps) {
  // store 订阅下沉到此组件，避免影响父组件
  const sseStatus = useCanvasStore(state => state.sseStatus);
  const batchMode = useCanvasStore(state => state.batchMode);
  const toggleBatchMode = useCanvasStore(state => state.toggleBatchMode);
  const workflowAutomation = useCanvasStore(state => state.workflowAutomation);
  const toggleWorkflowAutomation = useCanvasStore(state => state.toggleWorkflowAutomation);

  // P3-4: 计算各阶段进度
  const stageProgress = useMemo(() => {
    if (!timeline.chapters || timeline.chapters.length === 0) {
      return null;
    }
    return {
      script: calculateStageProgress(timeline.chapters, 'script_status'),
      shot: calculateStageProgress(timeline.chapters, 'shot_status'),
      final: calculateStageProgress(timeline.chapters, 'final_status'),
    };
  }, [timeline.chapters]);

  // P3-4: 是否有任务正在生成
  const hasGenerating = stageProgress && (
    stageProgress.script.generating > 0 ||
    stageProgress.shot.generating > 0 ||
    stageProgress.final.generating > 0
  );

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg p-4 m-4 shadow-xl">
      <div className="space-y-3 min-w-[280px]">
        {/* 标题和连接状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">整体进度</h3>
            {/* 添加章节按钮 */}
            <button
              onClick={onOpenAddChapter}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 transition-colors"
              title="添加章节"
            >
              <Plus className="w-4 h-4" />
            </button>
            {/* 设置按钮 */}
            <button
              onClick={onOpenSettings}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="时间线设置"
            >
              <Settings className="w-4 h-4" />
            </button>
            {/* 角色准备按钮 */}
            <button
              onClick={onOpenCharacterDrawer}
              className="relative p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 transition-colors"
              title="角色准备"
            >
              <Users className="w-4 h-4" />
            </button>
            {/* 全局操作 */}
            <GlobalActions timeline={timeline} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              {progress.completedChapters}/{progress.totalChapters} 章节
            </span>
            {/* SSE 连接状态指示器 */}
            <div className="flex items-center gap-1">
              {sseStatus === 'connected' ? (
                <Wifi className="w-3 h-3 text-green-400" />
              ) : sseStatus === 'reconnecting' ? (
                <Wifi className="w-3 h-3 text-purple-400 animate-pulse" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-400" />
              )}
              <span className="text-[10px] text-zinc-500">
                {sseStatus === 'connected' ? '已连接' : sseStatus === 'reconnecting' ? '重连中' : '离线'}
              </span>
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* P3-4: 各阶段进度详情 */}
        {stageProgress && (
          <div className="flex items-center gap-4 text-[10px]">
            {/* 剧本阶段 */}
            <div className="flex items-center gap-1.5">
              <FileText className={`w-3 h-3 ${
                stageProgress.script.generating > 0 ? 'text-purple-400 animate-pulse' :
                stageProgress.script.completed === stageProgress.script.total ? 'text-green-400' : 'text-zinc-500'
              }`} />
              <span className="text-zinc-400">剧本</span>
              <span className={
                stageProgress.script.generating > 0 ? 'text-purple-400' :
                stageProgress.script.completed === stageProgress.script.total ? 'text-green-400' : 'text-zinc-500'
              }>
                {stageProgress.script.completed}/{stageProgress.script.total}
              </span>
              {stageProgress.script.generating > 0 && (
                <span className="text-purple-400">({stageProgress.script.generating} 生成中)</span>
              )}
            </div>
            
            {/* 镜头阶段 */}
            <div className="flex items-center gap-1.5">
              <Camera className={`w-3 h-3 ${
                stageProgress.shot.generating > 0 ? 'text-purple-400 animate-pulse' :
                stageProgress.shot.completed === stageProgress.shot.total ? 'text-green-400' : 'text-zinc-500'
              }`} />
              <span className="text-zinc-400">镜头</span>
              <span className={
                stageProgress.shot.generating > 0 ? 'text-purple-400' :
                stageProgress.shot.completed === stageProgress.shot.total ? 'text-green-400' : 'text-zinc-500'
              }>
                {stageProgress.shot.completed}/{stageProgress.shot.total}
              </span>
              {stageProgress.shot.generating > 0 && (
                <span className="text-purple-400">({stageProgress.shot.generating} 生成中)</span>
              )}
            </div>
            
            {/* 漫画阶段 */}
            <div className="flex items-center gap-1.5">
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image className={`w-3 h-3 ${
                stageProgress.final.generating > 0 ? 'text-purple-400 animate-pulse' :
                stageProgress.final.completed === stageProgress.final.total ? 'text-green-400' : 'text-zinc-500'
              }`} />
              <span className="text-zinc-400">漫画</span>
              <span className={
                stageProgress.final.generating > 0 ? 'text-purple-400' :
                stageProgress.final.completed === stageProgress.final.total ? 'text-green-400' : 'text-zinc-500'
              }>
                {stageProgress.final.completed}/{stageProgress.final.total}
              </span>
              {stageProgress.final.generating > 0 && (
                <span className="text-purple-400">({stageProgress.final.generating} 生成中)</span>
              )}
            </div>
          </div>
        )}

        {/* 百分比和批量模式 */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-purple-400 font-medium">{progress.percentage}%</span>
          <div className="flex items-center gap-2">
            {progress.percentage < 100 ? (
              <span className="text-zinc-500">进行中</span>
            ) : (
              <span className="text-green-400">✓ 全部完成</span>
            )}

            {/* 工作流自动化开关 */}
            <button
              onClick={toggleWorkflowAutomation}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                workflowAutomation.enabled
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              title={workflowAutomation.enabled ? '自动化已启用' : '自动化已禁用'}
            >
              <Zap className={`w-3 h-3 ${workflowAutomation.enabled ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] font-medium">
                {workflowAutomation.enabled ? '自动' : '手动'}
              </span>
            </button>

            {/* 批量模式切换 */}
            <button
              onClick={toggleBatchMode}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                batchMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              <span className="text-[10px] font-medium">
                {batchMode ? '批量模式' : '批量'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
