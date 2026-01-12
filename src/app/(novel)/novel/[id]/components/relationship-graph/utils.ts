/**
 * 角色关系图谱工具函数
 */
import dagre from 'dagre';
import type { Node, Edge, Position } from 'reactflow';
import type {
  CharacterNode,
  RelationshipEdge,
  LayoutType,
  CharacterNodeData,
} from './types';
import type { Character } from '../../types';

/**
 * Dagre 布局配置
 */
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

/**
 * 节点宽度和高度
 */
const NODE_WIDTH = 180;
const NODE_HEIGHT = 120;

/**
 * 应用 Dagre 布局算法
 */
export function getLayoutedElements(
  nodes: CharacterNode[],
  edges: RelationshipEdge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: CharacterNode[]; edges: RelationshipEdge[] } {
  const isHorizontal = direction === 'LR';

  dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      targetPosition: (isHorizontal ? 'left' : 'top') as Position,
      sourcePosition: (isHorizontal ? 'right' : 'bottom') as Position,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * 圆形布局算法
 */
export function getCircleLayout(nodes: CharacterNode[]): CharacterNode[] {
  const radius = Math.max(200, nodes.length * 40);
  const angleStep = (2 * Math.PI) / nodes.length;

  return nodes.map((node, index) => {
    const angle = index * angleStep;
    const x = radius * Math.cos(angle) + 400;
    const y = radius * Math.sin(angle) + 300;

    return {
      ...node,
      position: { x, y },
    };
  });
}

/**
 * 网格布局算法
 */
export function getGridLayout(nodes: CharacterNode[]): CharacterNode[] {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const spacing = 250;

  return nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
      ...node,
      position: {
        x: col * spacing + 50,
        y: row * spacing + 50,
      },
    };
  });
}

/**
 * 将角色数据转换为图谱节点
 */
export function charactersToNodes(characters: Character[]): CharacterNode[] {
  return characters.map((char) => ({
    id: char.id,
    type: 'characterNode',
    position: { x: 0, y: 0 }, // 初始位置将由布局算法设置
    data: {
      id: char.id,
      name: char.name,
      role: char.role || 'supporting',
      description: char.description,
      relationshipCount: char.relationships?.length || 0,
    },
  }));
}

/**
 * 从角色关系数据生成边
 */
export function relationshipsToEdges(characters: Character[]): RelationshipEdge[] {
  const edges: RelationshipEdge[] = [];
  const processedPairs = new Set<string>();

  characters.forEach((char) => {
    if (!char.relationships) return;

    char.relationships.forEach((rel) => {
      const pairKey = [char.id, rel.characterId].sort().join('-');

      // 避免重复边(双向关系只创建一条边)
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      edges.push({
        id: `${char.id}-${rel.characterId}`,
        source: char.id,
        target: rel.characterId,
        type: 'relationshipEdge',
        data: {
          id: `${char.id}-${rel.characterId}`,
          source: char.id,
          target: rel.characterId,
          type: (rel.relation as any) || 'neutral',
          description: rel.description,
          isBidirectional: true,
        },
      });
    });
  });

  return edges;
}

/**
 * 应用布局算法
 */
export function applyLayout(
  nodes: CharacterNode[],
  edges: RelationshipEdge[],
  layoutType: LayoutType
): { nodes: CharacterNode[]; edges: RelationshipEdge[] } {
  switch (layoutType) {
    case 'dagre':
      return getLayoutedElements(nodes, edges, 'TB');
    case 'circle':
      return { nodes: getCircleLayout(nodes), edges };
    case 'grid':
      return { nodes: getGridLayout(nodes), edges };
    case 'force':
      // Force-directed layout 可以使用第三方库如 d3-force
      // 这里暂时返回 dagre 布局
      return getLayoutedElements(nodes, edges, 'TB');
    default:
      return { nodes, edges };
  }
}

/**
 * 计算节点的中心位置
 */
export function getNodeCenter(node: CharacterNode): { x: number; y: number } {
  return {
    x: node.position.x + NODE_WIDTH / 2,
    y: node.position.y + NODE_HEIGHT / 2,
  };
}

/**
 * 查找两个节点之间的边
 */
export function findEdgeBetweenNodes(
  edges: RelationshipEdge[],
  sourceId: string,
  targetId: string
): RelationshipEdge | undefined {
  return edges.find(
    (edge) =>
      (edge.source === sourceId && edge.target === targetId) ||
      (edge.source === targetId && edge.target === sourceId)
  );
}

/**
 * 生成唯一的边ID
 */
export function generateEdgeId(sourceId: string, targetId: string): string {
  return [sourceId, targetId].sort().join('-');
}
