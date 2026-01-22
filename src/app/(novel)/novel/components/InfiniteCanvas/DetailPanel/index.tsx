/**
 * 详情面板容器组件 (Vaul Drawer)
 *
 * 功能:
 * 1. 监听 Zustand store 的详情面板状态
 * 2. 根据节点类型动态渲染对应的详情面板
 * 3. 支持 ESC 键/点击遮罩/滑动关闭
 * 4. 使用 TanStack Query 按需加载详情数据
 */

"use client";

import { Drawer } from 'vaul';
import { X, Loader2 } from 'lucide-react';
import { useDetailPanel, useCloseDetail } from '@/stores/canvas-store';
import { Button } from '@/components/ui/button';

import { ScriptDetailPanel } from './ScriptDetailPanel';
import { ShotDetailPanel } from './ShotDetailPanel';
import { SceneDetailPanel } from './SceneDetailPanel';
import { FinalDetailPanel } from './FinalDetailPanel';

/**
 * 节点类型标题映射
 */
const NODE_TYPE_TITLES = {
  script: '剧本分段',
  shot: '镜头设计',
  scene: '场景图片',
  final: '最终漫画',
} as const;

/**
 * 详情抽屉组件
 */
export function DetailDrawer() {
  const { isOpen, nodeType, chapterId } = useDetailPanel();
  const closeDetail = useCloseDetail();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDetail();
    }
  };

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      direction="right"
      modal={true}
    >
      <Drawer.Portal>
        {/* 遮罩层 */}
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />

        {/* 抽屉内容 */}
        <Drawer.Content
          className="fixed right-0 top-0 bottom-0 w-full max-w-[700px] bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col focus:outline-none"
          aria-describedby={undefined}
        >
          {/* 拖动手柄 (移动端) */}
          <div className="flex items-center justify-center py-3 border-b border-zinc-800">
            <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
          </div>

          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
            <div>
              <Drawer.Title className="text-lg font-semibold text-white">
                {nodeType ? NODE_TYPE_TITLES[nodeType] : '详情'}
              </Drawer.Title>
              <p className="text-xs text-zinc-500 mt-1">
                查看和编辑生成内容
              </p>
            </div>

            {/* 关闭按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={closeDetail}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {!chapterId || !nodeType ? (
              // 加载占位
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm">加载中...</p>
              </div>
            ) : (
              // 根据节点类型渲染对应面板
              <div className="p-6">
                {nodeType === 'script' && (
                  <ScriptDetailPanel chapterId={chapterId} />
                )}
                {nodeType === 'shot' && (
                  <ShotDetailPanel chapterId={chapterId} />
                )}
                {nodeType === 'scene' && (
                  <SceneDetailPanel chapterId={chapterId} />
                )}
                {nodeType === 'final' && (
                  <FinalDetailPanel chapterId={chapterId} />
                )}
              </div>
            )}
          </div>

          {/* 底部操作栏 (可选) */}
          <div className="border-t border-zinc-800 px-6 py-4 bg-zinc-900/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                ESC 键或向右滑动关闭
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeDetail}
                className="text-zinc-400 hover:text-white"
              >
                关闭
              </Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
