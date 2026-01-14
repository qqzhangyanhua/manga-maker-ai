/**
 * 角色关系图谱类型定义
 */
import type { Node, Edge } from 'reactflow';

/**
 * 关系类型枚举
 */
export type RelationType =
  | "friend"      // 朋友
  | "enemy"       // 敌人
  | "lover"       // 恋人
  | "family"      // 亲人
  | "mentor"      // 师徒(导师)
  | "student"     // 师徒(学生)
  | "rival"       // 竞争对手
  | "colleague"   // 同事/盟友
  | "neutral";    // 中立

/**
 * 关系类型配置
 */
export interface RelationTypeConfig {
  type: RelationType;
  label: string;
  color: string;
  strokeWidth: number;
  animated?: boolean;
  markerEnd?: string;
}

/**
 * 关系类型样式映射
 */
export const RELATION_TYPE_CONFIGS: Record<RelationType, RelationTypeConfig> = {
  friend: {
    type: "friend",
    label: "朋友",
    color: "#10b981", // green-500
    strokeWidth: 2,
    animated: false,
  },
  enemy: {
    type: "enemy",
    label: "敌人",
    color: "#ef4444", // red-500
    strokeWidth: 3,
    animated: true,
    markerEnd: "arrow",
  },
  lover: {
    type: "lover",
    label: "恋人",
    color: "#ec4899", // pink-500
    strokeWidth: 3,
    animated: true,
  },
  family: {
    type: "family",
    label: "亲人",
    color: "#a855f7", // purple-500
    strokeWidth: 2,
  },
  mentor: {
    type: "mentor",
    label: "师父",
    color: "#8b5cf6", // violet-500
    strokeWidth: 2,
    markerEnd: "arrow",
  },
  student: {
    type: "student",
    label: "徒弟",
    color: "#6366f1", // indigo-500
    strokeWidth: 2,
    markerEnd: "arrow",
  },
  rival: {
    type: "rival",
    label: "对手",
    color: "#f97316", // orange-500
    strokeWidth: 2,
    animated: true,
  },
  colleague: {
    type: "colleague",
    label: "盟友",
    color: "#06b6d4", // cyan-500
    strokeWidth: 2,
  },
  neutral: {
    type: "neutral",
    label: "中立",
    color: "#64748b", // slate-500
    strokeWidth: 1,
  },
};

/**
 * 角色节点数据
 */
export interface CharacterNodeData {
  id: string;
  name: string;
  role: string; // protagonist/antagonist/supporting/minor
  description?: string;
  imageUrl?: string;
  relationshipCount?: number; // 关系数量
}

/**
 * 关系边数据
 */
export interface RelationshipEdgeData {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  description?: string;
  strength?: number; // 1-10
  isBidirectional?: boolean;
}

/**
 * 角色节点类型(React Flow)
 */
export type CharacterNode = Node<CharacterNodeData>;

/**
 * 关系边类型(React Flow)
 */
export type RelationshipEdge = Edge<RelationshipEdgeData>;

/**
 * 图谱布局类型
 */
export type LayoutType = "dagre" | "force" | "circle" | "grid";

/**
 * 图谱状态
 */
export interface GraphState {
  nodes: CharacterNode[];
  edges: RelationshipEdge[];
  selectedNode: string | null;
  selectedEdge: string | null;
  layoutType: LayoutType;
}

/**
 * 角色角色类型颜色映射
 */
export const ROLE_COLORS: Record<string, string> = {
  protagonist: "#3b82f6",   // blue-500
  antagonist: "#dc2626",    // red-600
  supporting: "#10b981",    // green-500
  minor: "#6b7280",         // gray-500
};

/**
 * 获取关系类型配置
 */
export function getRelationTypeConfig(type: RelationType): RelationTypeConfig {
  return RELATION_TYPE_CONFIGS[type] || RELATION_TYPE_CONFIGS.neutral;
}

/**
 * 获取角色角色颜色
 */
export function getRoleColor(role: string): string {
  return ROLE_COLORS[role] || ROLE_COLORS.minor;
}
