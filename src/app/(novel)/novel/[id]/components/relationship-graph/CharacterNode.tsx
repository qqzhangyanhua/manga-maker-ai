/**
 * 角色节点组件 - React Flow自定义节点
 */
"use client";

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { User } from 'lucide-react';
import type { CharacterNodeData } from './types';
import { getRoleColor } from './types';

export const CharacterNode = memo(({ data, selected }: NodeProps<CharacterNodeData>) => {
  const roleColor = getRoleColor(data.role);

  return (
    <div
      className={`
        relative bg-card border-2 rounded-lg shadow-lg
        transition-all duration-200
        ${selected ? 'border-primary shadow-xl scale-105' : 'border-border hover:border-primary/50'}
      `}
      style={{
        width: 180,
        minHeight: 120,
      }}
    >
      {/* 顶部角色类型标签 */}
      <div
        className="absolute -top-2 left-2 px-2 py-0.5 rounded text-xs font-semibold text-white"
        style={{ backgroundColor: roleColor }}
      >
        {getRoleLabel(data.role)}
      </div>

      {/* 连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary"
      />

      {/* 节点内容 */}
      <div className="p-4 pt-6">
        {/* 角色头像/图标 */}
        <div className="flex justify-center mb-2">
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt={data.name}
              className="w-12 h-12 rounded-full object-cover border-2"
              style={{ borderColor: roleColor }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center border-2"
              style={{ borderColor: roleColor, backgroundColor: `${roleColor}20` }}
            >
              <User className="w-6 h-6" style={{ color: roleColor }} />
            </div>
          )}
        </div>

        {/* 角色名称 */}
        <div className="text-center">
          <h3 className="font-semibold text-sm line-clamp-1">{data.name}</h3>
          {data.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {data.description}
            </p>
          )}
        </div>

        {/* 关系数量徽章 */}
        {(data.relationshipCount ?? 0) > 0 && (
          <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {data.relationshipCount}
          </div>
        )}
      </div>
    </div>
  );
});

CharacterNode.displayName = 'CharacterNode';

/**
 * 获取角色类型标签
 */
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    protagonist: '主角',
    antagonist: '反派',
    supporting: '配角',
    minor: '龙套',
  };
  return labels[role] || '其他';
}
