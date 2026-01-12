/**
 * 角色关系图谱主组件 - Phase 1 只读模式
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
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Circle, Network, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { CharacterNode } from './CharacterNode';
import { RelationshipEdge } from './RelationshipEdge';
import type { Character } from '../../types';
import type { CharacterNode as CharacterNodeType, RelationshipEdge as RelationshipEdgeType, LayoutType } from './types';
import {
  charactersToNodes,
  relationshipsToEdges,
  applyLayout,
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
}

export function CharacterRelationshipGraph({
  characters,
  readonly = true, // Phase 1 强制只读
}: CharacterRelationshipGraphProps) {
  const [layoutType, setLayoutType] = useState<LayoutType>('dagre');

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
    const { nodes: layoutedNodes, edges: layoutedEdges } = applyLayout(nodes, edges, newLayout);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, setNodes, setEdges]);

  // 无角色时的空状态
  if (characters.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center border rounded-lg bg-muted/20">
        <div className="text-center text-muted-foreground">
          <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-semibold mb-2">暂无角色</p>
          <p className="text-sm">请先在"角色"标签页添加角色</p>
        </div>
      </div>
    );
  }

  // 无关系时的提示
  const hasRelationships = edges.length > 0;

  return (
    <div className="h-[600px] border rounded-lg bg-background relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readonly ? undefined : onNodesChange}
        onEdgesChange={readonly ? undefined : onEdgesChange}
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
        <Panel position="top-right" className="flex gap-2">
          <div className="bg-background/95 backdrop-blur border rounded-lg shadow-lg p-2 flex gap-2">
            {/* 布局切换按钮 */}
            <Button
              variant={layoutType === 'dagre' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLayoutChange('dagre')}
              title="层次布局"
            >
              <Network className="w-4 h-4" />
            </Button>
            <Button
              variant={layoutType === 'circle' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLayoutChange('circle')}
              title="圆形布局"
            >
              <Circle className="w-4 h-4" />
            </Button>
            <Button
              variant={layoutType === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLayoutChange('grid')}
              title="网格布局"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </Panel>

        {/* 底部统计信息 */}
        <Panel position="bottom-right" className="bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3">
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

        {/* 无关系提示 */}
        {!hasRelationships && (
          <Panel position="top-center">
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg px-4 py-2">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                💡 提示: 在角色编辑对话框中添加角色关系，即可显示关系连线
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
