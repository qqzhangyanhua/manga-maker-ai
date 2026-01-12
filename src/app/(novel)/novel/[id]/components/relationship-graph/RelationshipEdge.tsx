/**
 * 关系连线组件 - React Flow自定义边
 */
"use client";

import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import type { RelationshipEdgeData } from './types';
import { getRelationTypeConfig } from './types';

export const RelationshipEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<RelationshipEdgeData>) => {
  const config = getRelationTypeConfig(data?.type || 'neutral');

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* 主连线 */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke={config.color}
        strokeWidth={selected ? config.strokeWidth + 1 : config.strokeWidth}
        fill="none"
        style={{
          opacity: selected ? 1 : 0.8,
        }}
      />

      {/* 动画效果(如果启用) */}
      {config.animated && (
        <path
          d={edgePath}
          stroke={config.color}
          strokeWidth={config.strokeWidth}
          fill="none"
          strokeDasharray="5 5"
          className="animate-dash"
          style={{
            opacity: 0.6,
          }}
        />
      )}

      {/* 箭头标记(如果需要) */}
      {config.markerEnd && (
        <defs>
          <marker
            id={`arrow-${id}`}
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 5, 0 10"
              fill={config.color}
            />
          </marker>
        </defs>
      )}

      {/* 边标签 */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            className={`
              px-2 py-1 rounded text-xs font-semibold
              transition-all duration-200
              ${selected ? 'shadow-lg scale-110' : 'shadow'}
            `}
            style={{
              backgroundColor: config.color,
              color: 'white',
            }}
          >
            {config.label}
          </div>

          {/* 关系描述(如果有) */}
          {data?.description && selected && (
            <div className="mt-1 px-2 py-1 bg-card border rounded text-xs max-w-[150px] text-center">
              {data.description}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>

      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -10;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
      `}</style>
    </>
  );
});

RelationshipEdge.displayName = 'RelationshipEdge';
