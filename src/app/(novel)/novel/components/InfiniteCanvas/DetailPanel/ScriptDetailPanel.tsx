/**
 * 剧本分段详情面板
 *
 * 功能:
 * 1. 显示章节的所有剧本分段
 * 2. 支持展开/折叠分段文本
 * 3. 显示场景描述、角色动作、对话
 * 4. 支持重新生成单个分段
 */

"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Users,
  MessageSquare,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { ScriptDetailListResponse } from '../detail-panel-types';

interface ScriptDetailPanelProps {
  chapterId: string;
}

type ScriptSegment = ScriptDetailListResponse['segments'][number];

/**
 * 单个分段卡片组件
 */
function SegmentCard({ segment }: { segment: ScriptSegment }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-600 transition-colors">
      {/* 分段头部 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-purple-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          )}
          <div className="text-left">
            <div className="text-sm font-medium text-white">
              分段 {segment.segment_order}
            </div>
            <div className="text-xs text-zinc-500">
              {segment.emotion_tone || '未标注情绪'} · {segment.estimated_duration}秒
            </div>
          </div>
        </div>

        {/* 快速预览 */}
        {!isExpanded && (
          <div className="text-xs text-zinc-400 truncate max-w-[300px]">
            {segment.content.substring(0, 50)}...
          </div>
        )}
      </button>

      {/* 分段详情 (展开时显示) */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-700">
          {/* 完整内容 */}
          <div>
            <div className="flex items-center gap-2 mb-2 mt-3">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium text-zinc-400">剧本内容</span>
            </div>
            <div className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/50 rounded p-3">
              {segment.content}
            </div>
          </div>

          {/* 场景描述 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-zinc-400">场景描述</span>
            </div>
            <div className="text-sm text-zinc-400 bg-zinc-900/50 rounded p-3">
              {segment.scene_description}
            </div>
          </div>

          {/* 角色动作 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-medium text-zinc-400">角色动作</span>
            </div>
            <div className="text-sm text-zinc-400 bg-zinc-900/50 rounded p-3">
              {segment.character_actions}
            </div>
          </div>

          {/* 对话 */}
          {segment.dialogue && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-medium text-zinc-400">对话</span>
              </div>
              <div className="text-sm text-zinc-300 bg-zinc-900/50 rounded p-3 italic">
                "{segment.dialogue}"
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              重新生成
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 剧本详情面板主组件
 */
export function ScriptDetailPanel({ chapterId }: ScriptDetailPanelProps) {
  const queryClient = useQueryClient();

  // 获取剧本分段数据
  const { data, isLoading, error } = useQuery<ScriptDetailListResponse>({
    queryKey: ['script-detail', chapterId],
    queryFn: async () => {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/script`);
      if (!response.ok) {
        throw new Error('获取剧本详情失败');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5分钟缓存
  });

  // 重新生成剧本
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/canvas/chapter/${chapterId}/generate-script`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('重新生成失败');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('开始重新生成剧本');
      queryClient.invalidateQueries({ queryKey: ['script-detail', chapterId] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
    onError: (error: Error) => {
      toast.error('重新生成失败', { description: error.message });
    },
  });

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p className="text-sm">加载剧本分段中...</p>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-400">
        <AlertCircle className="w-8 h-8 mb-3" />
        <p className="text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  // 空状态
  if (!data || data.segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <FileText className="w-12 h-12 mb-3 text-zinc-600" />
        <p className="text-sm mb-4">暂无剧本分段</p>
        <Button
          onClick={() => regenerateMutation.mutate()}
          disabled={regenerateMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {regenerateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              生成剧本
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部统计 */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white mb-1">
              第 {data.chapterNumber} 章剧本
            </h3>
            <p className="text-xs text-zinc-400">
              共 {data.totalCount} 个分段
            </p>
          </div>
          <Button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            variant="outline"
            size="sm"
            className="border-purple-800/50 text-purple-300 hover:bg-purple-900/30"
          >
            {regenerateMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                生成中
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                重新生成全部
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 分段列表 */}
      <div className="space-y-3">
        {data.segments.map((segment) => (
          <SegmentCard key={segment.id} segment={segment} />
        ))}
      </div>
    </div>
  );
}
