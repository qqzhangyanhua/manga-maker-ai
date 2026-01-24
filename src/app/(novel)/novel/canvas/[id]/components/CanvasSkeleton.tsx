/**
 * Canvas 页面骨架屏组件
 * 用于 Loading 状态，避免布局抖动（CLS）
 */

import { Loader2 } from "lucide-react";

export function CanvasSkeleton() {
  return (
    <div className="h-screen bg-[#0f0f13] flex flex-col text-zinc-100 novel-theme-scope">
      {/* Header 骨架 */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-800 bg-[#0f0f13]/80 backdrop-blur-md">
        {/* 返回按钮骨架 */}
        <div className="w-20 h-9 bg-zinc-800/50 animate-pulse rounded" />

        {/* 标题区域骨架 */}
        <div className="flex-1 min-w-0">
          <div className="h-6 w-48 bg-zinc-800/50 animate-pulse rounded mb-1" />
          <div className="h-4 w-32 bg-zinc-800/50 animate-pulse rounded" />
        </div>

        {/* 右侧操作区骨架 */}
        <div className="flex items-center gap-2">
          {/* 图片按钮骨架 */}
          <div className="w-24 h-9 bg-zinc-800/50 animate-pulse rounded hidden sm:block" />
          <div className="w-9 h-9 bg-zinc-800/50 animate-pulse rounded sm:hidden" />

          {/* 风格选择器骨架 */}
          <div className="w-20 h-9 bg-zinc-800/50 animate-pulse rounded" />
        </div>
      </div>

      {/* Canvas 区域 - 显示 Loading 指示器 */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0f0f13]">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-zinc-600 animate-spin" />
          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-zinc-800/30" />
        </div>
        <p className="mt-4 text-zinc-500 text-sm animate-pulse">加载时间线中...</p>
      </div>
    </div>
  );
}
