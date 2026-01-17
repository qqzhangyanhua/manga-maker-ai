"use client";

import { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Wifi, WifiOff, CheckSquare, Zap, Settings, Plus } from 'lucide-react';

import type { PaginatedTimeline, WindowState, ChapterSummary } from './types';
import { transformTimelineToFlow, calculateOverallProgress } from './utils/transformData';
import {
  ChapterHeaderNode,
  ScriptNode,
  ShotNode,
  SceneNode,
  FinalNode,
} from './nodes';
import { DetailDrawer } from './DetailPanel';
import { useCanvasStore } from '@/stores/canvas-store';
import { useRealtimeCanvas } from '@/hooks/useRealtimeCanvas';
import { useWorkflowAutomation } from '@/hooks/useWorkflowAutomation';
import { BatchToolbar } from './BatchToolbar';
import { GlobalActions } from './GlobalActions';
import { TimelineSettings } from './TimelineSettings';
import { GenerationProgress } from './GenerationProgress';
import { AddChapterDialog } from './AddChapterDialog';
import { GenerateSceneDialog } from './GenerateSceneDialog';
import { EmptyCanvasState } from './EmptyCanvasState';
import { ChapterNavigator } from './ChapterNavigator';
import { WindowNavigationPanel } from './WindowNavigationPanel';

interface InfiniteCanvasViewProps {
  timeline: PaginatedTimeline;
  windowState?: WindowState;
  chapterSummaries: ChapterSummary[];
  onRefresh: () => void;
  onNavigate: (chapterNumber: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpFirst: () => void;
  onJumpLast: () => void;
  isLoading?: boolean;
}

// 注册自定义节点类型
const nodeTypes = {
  chapterHeader: ChapterHeaderNode,
  script: ScriptNode,
  shot: ShotNode,
  scene: SceneNode,
  final: FinalNode,
};

export function InfiniteCanvasView({
  timeline,
  windowState,
  chapterSummaries,
  onRefresh,
  onNavigate,
  onPrev,
  onNext,
  onJumpFirst,
  onJumpLast,
  isLoading = false,
}: InfiniteCanvasViewProps) {
  // 设置面板状态
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 添加章节对话框状态
  const [addChapterOpen, setAddChapterOpen] = useState(false);

  // 场景生成弹窗状态 (从 store 获取)
  const sceneDialog = useCanvasStore(state => state.sceneDialog);
  const closeSceneDialog = useCanvasStore(state => state.closeSceneDialog);

  // 调试：监听状态变化
  useEffect(() => {
    console.log('[InfiniteCanvasView] addChapterOpen 状态变化:', addChapterOpen);
  }, [addChapterOpen]);

  // 转换数据为 React Flow 格式
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => transformTimelineToFlow(timeline),
    [timeline]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 同步 timeline 数据到 React Flow 节点
  useEffect(() => {
    console.log('[InfiniteCanvasView] Timeline 数据更新，同步节点', {
      chapterCount: timeline.chapters?.length || 0,
      timestamp: new Date().toISOString(),
      chapters: timeline.chapters?.map(ch => ({
        id: ch.id,
        number: ch.chapter_number,
        scriptStatus: ch.script_status,
        scriptCount: ch.script_segment_count,
        shotStatus: ch.shot_status,
        shotCount: ch.shot_count,
        sceneStatus: ch.scene_status,
        sceneCount: ch.scene_image_count,
        finalStatus: ch.final_status,
        finalCount: ch.final_image_count,
      })),
    });
    const { nodes: newNodes, edges: newEdges } = transformTimelineToFlow(timeline);
    console.log('[InfiniteCanvasView] 生成节点', {
      nodeCount: newNodes.length,
      edgeCount: newEdges.length,
      timestamp: new Date().toISOString(),
    });
    setNodes(newNodes);
    setEdges(newEdges);
  }, [timeline, setNodes, setEdges]);

  // 计算全局进度
  const progress = useMemo(() => calculateOverallProgress(timeline), [timeline]);

  // SSE 连接状态
  const sseStatus = useCanvasStore(state => state.sseStatus);

  // 批量模式相关
  const batchMode = useCanvasStore(state => state.batchMode);
  const toggleBatchMode = useCanvasStore(state => state.toggleBatchMode);
  const clearSelection = useCanvasStore(state => state.clearSelection);
  const setSelectedNodeIds = useCanvasStore(state => state.setSelectedNodeIds);

  // 工作流自动化状态
  const workflowAutomation = useCanvasStore(state => state.workflowAutomation);
  const toggleWorkflowAutomation = useCanvasStore(state => state.toggleWorkflowAutomation);

  // 启用 SSE 实时更新
  useRealtimeCanvas(timeline.id);

  // 启用工作流自动化
  useWorkflowAutomation(timeline.id);

  // 刷新数据时更新节点
  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="w-full h-full bg-[#0f0f13]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.5,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{
          hideAttribution: true,
        }}
      >
        {/* 背景网格 */}
        <Background
          color="#27272a"
          gap={20}
          size={1}
          className="bg-[#0f0f13]"
        />

        {/* 空状态引导 - 仅在没有章节时显示 */}
        {(!timeline.chapters || timeline.chapters.length === 0) && (
          <Panel position="top-center" className="mt-32">
            <EmptyCanvasState
              onAddChapter={() => setAddChapterOpen(true)}
              projectTitle={timeline.title}
            />
          </Panel>
        )}

        {/* 缩放控制 */}
        <Controls
          className="bg-zinc-900 border-zinc-800"
          showInteractive={false}
        />

        {/* 迷你地图 */}
        <MiniMap
          className="bg-zinc-900 border-zinc-800"
          nodeColor={(node) => {
            if (node.type === 'chapterHeader') return '#a855f7';
            const status = node.data.status;
            switch (status) {
              case 'pending':
                return '#52525b';
              case 'generating':
                return '#a855f7';
              case 'completed':
                return '#22c55e';
              case 'error':
                return '#ef4444';
              default:
                return '#52525b';
            }
          }}
          maskColor="rgba(15, 15, 19, 0.8)"
        />

        {/* 顶部面板 - 全局进度 */}
        <Panel position="top-left" className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg p-4 m-4 shadow-xl">
          <div className="space-y-3 min-w-[280px]">
            {/* 标题和连接状态 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">整体进度</h3>
                {/* 添加章节按钮 */}
                <button
                  onClick={() => setAddChapterOpen(true)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-purple-400 transition-colors"
                  title="添加章节"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {/* 设置按钮 */}
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="时间线设置"
                >
                  <Settings className="w-4 h-4" />
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
                    <Wifi className="w-3 h-3 text-yellow-400 animate-pulse" />
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
                      ? 'bg-amber-600 text-white'
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
        </Panel>

        {/* 右侧章节导航器 */}
        {chapterSummaries.length > 0 && windowState && (
          <Panel position="top-right" className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg p-3 m-4 shadow-xl">
            <ChapterNavigator
              summaries={chapterSummaries}
              window={windowState}
              onNavigate={onNavigate}
            />
          </Panel>
        )}

        {/* 底部翻页面板 */}
        {windowState && windowState.total > 5 && (
          <Panel position="bottom-center" className="mb-4">
            <WindowNavigationPanel
              window={windowState}
              onPrev={onPrev}
              onNext={onNext}
              onJumpFirst={onJumpFirst}
              onJumpLast={onJumpLast}
              isLoading={isLoading}
            />
          </Panel>
        )}
      </ReactFlow>

      {/* 详情面板 Drawer */}
      <DetailDrawer />

      {/* 批量操作工具栏 */}
      <BatchToolbar />

      {/* 设置面板 */}
      <TimelineSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        timelineId={timeline.id}
        currentConfig={timeline.config}
        onSaved={onRefresh}
      />

      {/* 生成进度浮窗 */}
      <GenerationProgress timeline={timeline} />

      {/* 添加章节对话框 */}
      <AddChapterDialog
        open={addChapterOpen}
        onClose={() => setAddChapterOpen(false)}
        timelineId={timeline.id}
        novelProjectId={timeline.novel_project_id}
        projectTitle={timeline.title}
        onAdded={handleRefresh}
      />

      {/* 场景生成对话框 */}
      {sceneDialog.chapterId && sceneDialog.timelineId && (
        <GenerateSceneDialog
          open={sceneDialog.isOpen}
          onOpenChange={(open) => !open && closeSceneDialog()}
          chapterId={sceneDialog.chapterId}
          chapterTitle={sceneDialog.chapterTitle || ''}
          chapterNumber={sceneDialog.chapterNumber || 1}
          timelineId={sceneDialog.timelineId}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
