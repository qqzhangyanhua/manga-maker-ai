"use client";

import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { BookOpen, Users } from 'lucide-react';
import { ChapterCharacterDialog } from '../ChapterCharacterDialog';
import type { ChapterHeaderNodeData } from '../nodes-types';

interface ChapterHeaderNodeProps {
  data: ChapterHeaderNodeData;
}

export const ChapterHeaderNode = memo(({ data }: ChapterHeaderNodeProps) => {
  const [characterDialogOpen, setCharacterDialogOpen] = useState(false);

  const handleCharacterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCharacterDialogOpen(true);
  };

  return (
    <div className="relative">
      <div className="w-[180px] h-[220px] rounded-xl border-2 border-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-800 shadow-xl overflow-hidden">
        {/* 进度条背景 */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 transition-all duration-500"
          style={{
            clipPath: `inset(${100 - data.progress}% 0 0 0)`,
          }}
        />

        {/* 内容 */}
        <div className="relative z-10 p-4 h-full flex flex-col">
          {/* 头部 */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/50">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-zinc-400">Chapter</div>
              <div className="text-lg font-bold text-white">#{data.chapterNumber}</div>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-3" />

          {/* 进度信息 */}
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="relative w-20 h-20">
              {/* 圆形进度条 */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="none"
                  className="text-zinc-700"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="5"
                  fill="none"
                  className="text-purple-500 transition-all duration-500"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - data.progress / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              {/* 百分比文字 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{data.progress}%</span>
              </div>
            </div>
          </div>

          {/* 底部操作区 */}
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-zinc-400">
              {data.progress === 100 ? '已完成' : data.progress === 0 ? '待开始' : '进行中'}
            </div>
            {/* 角色管理按钮 */}
            <button
              onClick={handleCharacterClick}
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-xs"
              title="管理章节角色"
            >
              <Users className="w-3 h-3" />
              {data.characterCount !== undefined && data.characterCount > 0 && (
                <span>{data.characterCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* React Flow Handle - 右侧输出 */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500 border-2 border-white"
      />

      {/* 角色管理对话框 */}
      <ChapterCharacterDialog
        open={characterDialogOpen}
        onClose={() => setCharacterDialogOpen(false)}
        chapterId={data.chapterId}
        chapterNumber={data.chapterNumber}
        timelineId={data.timelineId}
      />
    </div>
  );
});

ChapterHeaderNode.displayName = 'ChapterHeaderNode';
