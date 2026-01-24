"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

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
import { TimelineSettings } from './TimelineSettings';
import { GenerationProgress } from './GenerationProgress';
import { AddChapterDialog } from './AddChapterDialog';
import { GenerateSceneDialog } from './GenerateSceneDialog';
import { GenerateFinalDialog } from './GenerateFinalDialog';
import { EmptyCanvasState } from './EmptyCanvasState';
import { ChapterNavigator } from './ChapterNavigator';
import { WindowNavigationPanel } from './WindowNavigationPanel';
import { CharacterPreparationDrawer } from './CharacterPreparationDrawer';
import { TopProgressPanel } from './TopProgressPanel';

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
  // 角色准备抽屉状态
  const [characterDrawerOpen, setCharacterDrawerOpen] = useState(false);

  // 场景生成弹窗状态 (从 store 获取)
  const sceneDialog = useCanvasStore(state => state.sceneDialog);
  const closeSceneDialog = useCanvasStore(state => state.closeSceneDialog);

  // 最终漫画生成弹窗状态 (从 store 获取)
  const finalDialog = useCanvasStore(state => state.finalDialog);
  const closeFinalDialog = useCanvasStore(state => state.closeFinalDialog);

  // React Query client for cache management
  const queryClient = useQueryClient();

  // ✅ 优化1: 只 transform 一次，用 useMemo 缓存
  const flow = useMemo(
    () => transformTimelineToFlow(timeline),
    [timeline]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.edges);

  // 用于追踪上一次的节点数量，避免不必要的 setNodes
  const prevNodeCountRef = useRef(flow.nodes.length);
  const prevEdgeCountRef = useRef(flow.edges.length);

  // ✅ 优化2: 增量同步节点，避免无意义的全量重置
  useEffect(() => {
    const nodeCountChanged = flow.nodes.length !== prevNodeCountRef.current;
    const edgeCountChanged = flow.edges.length !== prevEdgeCountRef.current;
    
    // 只在节点数量变化或需要更新 data 时才 setNodes
    if (nodeCountChanged || edgeCountChanged) {
      setNodes(flow.nodes);
      setEdges(flow.edges);
      prevNodeCountRef.current = flow.nodes.length;
      prevEdgeCountRef.current = flow.edges.length;
    } else {
      // 节点数量相同时，只更新 data 字段（保留 position 等交互状态）
      setNodes(prevNodes => 
        prevNodes.map((node, index) => {
          const newNode = flow.nodes[index];
          if (!newNode) return node;
          // 只有 data 变化时才更新
          if (JSON.stringify(node.data) !== JSON.stringify(newNode.data)) {
            return { ...node, data: newNode.data };
          }
          return node;
        })
      );
    }
  }, [flow.nodes, flow.edges, setNodes, setEdges]);

  // 计算全局进度
  const progress = useMemo(() => calculateOverallProgress(timeline), [timeline]);

  // ✅ 优化3: 稳定的 nodeColor 回调，避免 MiniMap 不必要的重渲染
  const getNodeColor = useCallback((node: Node) => {
    if (node.type === 'chapterHeader') return '#a855f7';
    const status = node.data?.status;
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
  }, []);

  // 启用 SSE 实时更新
  useRealtimeCanvas(timeline.id);

  // 启用工作流自动化
  useWorkflowAutomation(timeline.id);

  // 最终漫画生成 mutation
  const generateFinalsMutation = useMutation({
    mutationFn: async ({ chapterId, selectedCharacters }: {
      chapterId: string;
      selectedCharacters: Array<{
        name: string;
        role: string;
        description: string;
        tempId: string;
      }>;
    }) => {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/generate-finals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characters: selectedCharacters
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '生成失败');
      }
      return response.json();
    },
    onMutate: async ({ chapterId }) => {
      // 乐观更新: 立即关闭弹窗并显示 generating 状态
      closeFinalDialog();

      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: ['timeline', timeline.id] });

      // 获取并保存之前的数据
      const queries = queryClient.getQueriesData({ queryKey: ['timeline', timeline.id] });
      const previousDataMap = new Map(queries);

      // 更新所有匹配的查询缓存
      queryClient.setQueriesData(
        { queryKey: ['timeline', timeline.id] },
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const data = old as { chapters?: Array<{ id: string; final_status: string }> };
          if (!data.chapters) return old;
          return {
            ...data,
            chapters: data.chapters.map((ch) =>
              ch.id === chapterId
                ? { ...ch, final_status: 'generating' }
                : ch
            ),
          };
        }
      );

      return { previousDataMap };
    },
    onSuccess: async (responseData, { chapterId }) => {
      toast.success('漫画生成成功', {
        description: `生成 ${responseData.metadata?.panel_count || 0} 张漫画`
      });

      // 更新缓存为完成状态
      queryClient.setQueriesData(
        { queryKey: ['timeline', timeline.id] },
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const data = old as { chapters?: Array<{ id: string; final_status: string; final_image_count: number }> };
          if (!data.chapters) return old;
          return {
            ...data,
            chapters: data.chapters.map((ch) =>
              ch.id === chapterId
                ? {
                    ...ch,
                    final_status: 'completed',
                    final_image_count: responseData.metadata?.panel_count || 0,
                  }
                : ch
            ),
          };
        }
      );

      // 刷新数据以确保与数据库同步
      await queryClient.refetchQueries({ queryKey: ['timeline', timeline.id] });
    },
    onError: (error: Error, _variables, context) => {
      toast.error('漫画生成失败', { description: error.message });
      // 回滚到之前的数据
      if (context?.previousDataMap) {
        context.previousDataMap.forEach((data, key) => {
          queryClient.setQueryData(key as string[], data);
        });
      }
    },
  });

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

        {/* 迷你地图 - 使用稳定的 nodeColor 回调 */}
        <MiniMap
          className="bg-zinc-900 border-zinc-800"
          nodeColor={getNodeColor}
          maskColor="rgba(15, 15, 19, 0.8)"
        />

        {/* ✅ 优化4: 顶部面板独立组件，store 订阅下沉，避免影响 ReactFlow */}
        <Panel position="top-left">
          <TopProgressPanel
            timeline={timeline}
            progress={progress}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenAddChapter={() => setAddChapterOpen(true)}
            onOpenCharacterDrawer={() => setCharacterDrawerOpen(true)}
          />
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

      {/* 最终漫画生成对话框 */}
      {finalDialog.chapterId && finalDialog.timelineId && (
        <GenerateFinalDialog
          open={finalDialog.isOpen}
          onOpenChange={(open) => !open && closeFinalDialog()}
          chapterId={finalDialog.chapterId}
          chapterTitle={finalDialog.chapterTitle || ''}
          chapterNumber={finalDialog.chapterNumber || 1}
          timelineId={finalDialog.timelineId}
          onConfirm={(selectedCharacters) => {
            generateFinalsMutation.mutate({
              chapterId: finalDialog.chapterId!,
              selectedCharacters
            });
          }}
        />
      )}

      {/* 角色准备抽屉 */}
      <CharacterPreparationDrawer
        isOpen={characterDrawerOpen}
        onClose={() => setCharacterDrawerOpen(false)}
        chapterId={timeline.chapters?.[0]?.id || null}
        timelineId={timeline.id}
      />
    </div>
  );
}
