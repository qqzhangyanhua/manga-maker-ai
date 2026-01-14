/**
 * 角色关系图谱主组件 - Phase 2 完整编辑模式
 */
"use client";

import { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Network, Info } from 'lucide-react';
import { toast } from 'sonner';
import { CharacterNode } from './CharacterNode';
import { RelationshipEdge } from './RelationshipEdge';
import { RelationshipEditDialog } from './RelationshipEditDialog';
import { GraphToolbar } from './GraphToolbar';
import type { Character } from '../../types';
import type {
  CharacterNode as CharacterNodeType,
  RelationshipEdge as RelationshipEdgeType,
  LayoutType,
  RelationshipEdgeData,
} from './types';
import {
  charactersToNodes,
  relationshipsToEdges,
  applyLayout,
  generateEdgeId,
} from './utils';

/**
 * 节点类型映射
 */
const nodeTypes = {
  characterNode: CharacterNode,
};

/**
 * 边类型映射
 */
const edgeTypes = {
  relationshipEdge: RelationshipEdge,
};

interface CharacterRelationshipGraphProps {
  characters: Character[];
  projectId?: string;
  readonly?: boolean;
  onSaveRelationships?: (updatedCharacters: Character[]) => Promise<void>;
}

/**
 * 内部组件 - 必须在 ReactFlowProvider 内使用
 */
function CharacterRelationshipGraphInner({
  characters,
  projectId,
  readonly = false, // Phase 2 默认可编辑
  onSaveRelationships,
}: CharacterRelationshipGraphProps) {
  const [layoutType, setLayoutType] = useState<LayoutType>('dagre');
  const [isSaving, setIsSaving] = useState(false);

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<RelationshipEdgeType | null>(null);

  const { getNodes, getEdges, fitView } = useReactFlow();

  // 转换角色数据为图谱节点和边
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = charactersToNodes(characters);
    const edges = relationshipsToEdges(characters);
    const { nodes: layoutedNodes, edges: layoutedEdges } = applyLayout(nodes, edges, layoutType);

    return {
      initialNodes: layoutedNodes,
      initialEdges: layoutedEdges,
    };
  }, [characters, layoutType]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 切换布局
  const handleLayoutChange = useCallback((newLayout: LayoutType) => {
    setLayoutType(newLayout);
    const { nodes: layoutedNodes, edges: layoutedEdges } = applyLayout(
      getNodes(),
      getEdges(),
      newLayout
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // 自动适应视图
    setTimeout(() => fitView({ duration: 300 }), 0);
  }, [getNodes, getEdges, setNodes, setEdges, fitView]);

  // 处理连线创建 (拖拽节点创建关系)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // 检查是否已存在关系
      const existingEdge = edges.find(
        (edge) =>
          (edge.source === connection.source && edge.target === connection.target) ||
          (edge.source === connection.target && edge.target === connection.source)
      );

      if (existingEdge) {
        toast.error('这两个角色之间已经存在关系了');
        return;
      }

      // 创建新边
      const newEdge: RelationshipEdgeType = {
        id: generateEdgeId(connection.source, connection.target),
        source: connection.source,
        target: connection.target,
        type: 'relationshipEdge',
        data: {
          id: generateEdgeId(connection.source, connection.target),
          source: connection.source,
          target: connection.target,
          type: 'neutral', // 默认中立关系
          isBidirectional: true,
        },
      };

      setEdges((eds) => addEdge(newEdge as Edge, eds));
      toast.success('已创建新关系,请双击编辑关系类型');
    },
    [edges, setEdges]
  );

  // 处理边点击 (打开编辑对话框)
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge as RelationshipEdgeType);
      setEditDialogOpen(true);
    },
    []
  );

  // 保存关系编辑
  const handleSaveRelationship = useCallback(
    (updatedData: Partial<RelationshipEdgeData>) => {
      if (!selectedEdge) return;

      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === selectedEdge.id
            ? {
              ...edge,
              data: {
                ...edge.data,
                ...updatedData,
              },
            }
            : edge
        )
      );

      toast.success('关系已更新');
    },
    [selectedEdge, setEdges]
  );

  // 删除关系
  const handleDeleteRelationship = useCallback(() => {
    if (!selectedEdge) return;

    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
    toast.success('关系已删除');
  }, [selectedEdge, setEdges]);

  // 保存所有更改到数据库
  const handleSave = useCallback(async () => {
    if (!onSaveRelationships) {
      toast.error('保存功能未配置');
      return;
    }

    setIsSaving(true);

    try {
      // 构建更新后的角色数据
      const currentEdges = getEdges();
      const updatedCharacters = characters.map((char) => {
        // 找到该角色相关的所有边
        const relatedEdges = currentEdges.filter(
          (edge) => edge.source === char.id || edge.target === char.id
        );

        // 构建关系数组
        const relationships = relatedEdges.map((edge) => {
          const edgeData = edge.data as RelationshipEdgeData;
          const isSource = edge.source === char.id;
          const otherCharId = isSource ? edge.target : edge.source;

          return {
            characterId: otherCharId,
            relation: edgeData.type,
            description: edgeData.description,
          };
        });

        return {
          ...char,
          relationships,
        };
      });

      await onSaveRelationships(updatedCharacters);
      toast.success('关系图谱已保存');
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败,请重试');
    } finally {
      setIsSaving(false);
    }
  }, [characters, getEdges, onSaveRelationships]);

  // 重置布局
  const handleReset = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = applyLayout(
      charactersToNodes(characters),
      relationshipsToEdges(characters),
      layoutType
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setTimeout(() => fitView({ duration: 300 }), 0);
    toast.success('布局已重置');
  }, [characters, layoutType, setNodes, setEdges, fitView]);

  // 导出图片
  const handleExportImage = useCallback(() => {
    const reactFlowElement = document.querySelector('.react-flow');
    if (!reactFlowElement) {
      toast.error('未找到图谱元素');
      return;
    }

    // 使用 html2canvas 或 React Flow 的内置方法
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(reactFlowElement as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
      }).then((canvas) => {
        const link = document.createElement('a');
        link.download = `character-relationship-graph-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('图片已导出');
      }).catch((error) => {
        console.error('导出失败:', error);
        toast.error('导出失败,请重试');
      });
    }).catch(() => {
      toast.error('导出功能需要先安装 html2canvas 库');
    });
  }, []);

  // 无角色时的空状态
  if (characters.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center border border-purple-500/10 rounded-lg bg-zinc-900/40 backdrop-blur-sm">
        <div className="text-center text-zinc-400">
          <Network className="w-16 h-16 mx-auto mb-4 opacity-50 text-purple-500" />
          <p className="text-lg font-semibold mb-2">暂无角色</p>
          <p className="text-sm">请先在"角色"标签页添加角色</p>
        </div>
      </div>
    );
  }

  // 查找选中边的角色名称
  const sourceCharacter = characters.find((c) => c.id === selectedEdge?.source);
  const targetCharacter = characters.find((c) => c.id === selectedEdge?.target);

  const hasRelationships = edges.length > 0;

  return (
    <div className="h-[600px] border border-purple-500/10 rounded-lg bg-zinc-900/40 backdrop-blur-sm relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readonly ? undefined : onNodesChange}
        onEdgesChange={readonly ? undefined : onEdgesChange}
        onConnect={readonly ? undefined : onConnect}
        onEdgeClick={readonly ? undefined : onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'relationshipEdge',
          animated: false,
        }}
        connectionLineStyle={{ stroke: '#888', strokeWidth: 2, strokeDasharray: '5 5' }}
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={true}
      >
        {/* 背景网格 */}
        <Background color="#aaa" gap={16} />

        {/* 缩放控制 */}
        <Controls />

        {/* 小地图 */}
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as any;
            if (data.role === 'protagonist') return '#3b82f6';
            if (data.role === 'antagonist') return '#dc2626';
            if (data.role === 'supporting') return '#10b981';
            return '#6b7280';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        {/* 顶部工具栏 */}
        <Panel position="top-right">
          <GraphToolbar
            layoutType={layoutType}
            onLayoutChange={handleLayoutChange}
            onSave={readonly ? undefined : handleSave}
            onExportImage={handleExportImage}
            onReset={readonly ? undefined : handleReset}
            isSaving={isSaving}
            readonly={readonly}
          />
        </Panel>

        {/* 底部统计信息 */}
        <Panel position="bottom-right" className="bg-zinc-900/80 backdrop-blur-md border border-purple-500/20 rounded-lg shadow-lg shadow-purple-500/10 p-3">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>{nodes.length} 个角色</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{edges.length} 条关系</span>
            </div>
          </div>
        </Panel>

        {/* 编辑提示 */}
        {!readonly && !hasRelationships && (
          <Panel position="top-center">
            <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                <Info className="w-4 h-4" />
                <span>拖拽一个角色到另一个角色可创建关系,双击关系连线可编辑</span>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* 关系编辑对话框 */}
      <RelationshipEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        relationshipData={selectedEdge?.data || null}
        sourceCharacterName={sourceCharacter?.name}
        targetCharacterName={targetCharacter?.name}
        onSave={handleSaveRelationship}
        onDelete={handleDeleteRelationship}
      />
    </div>
  );
}

/**
 * 导出组件 - 包裹 ReactFlowProvider
 */
export function CharacterRelationshipGraph(props: CharacterRelationshipGraphProps) {
  return (
    <ReactFlowProvider>
      <CharacterRelationshipGraphInner {...props} />
    </ReactFlowProvider>
  );
}
