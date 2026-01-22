/**
 * 空状态引导组件
 *
 * 当无限画布中没有章节时显示此组件，引导用户添加第一个章节
 */

"use client";

import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyCanvasStateProps {
  onAddChapter: () => void;
  projectTitle: string;
}

export function EmptyCanvasState({ onAddChapter, projectTitle }: EmptyCanvasStateProps) {
  const handleClick = () => {
    console.log('[EmptyCanvasState] 按钮被点击');
    onAddChapter();
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 relative z-50">
      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-2 border-dashed border-purple-700/50 rounded-2xl p-12 max-w-md shadow-2xl">
        <BookOpen className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">开始创作你的漫画</h2>
        <p className="text-zinc-400 mb-6">
          为「{projectTitle}」添加章节，AI 将自动生成剧本、镜头设计和场景图片
        </p>
        <Button
          onClick={handleClick}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/30 cursor-pointer relative z-50"
          size="lg"
          type="button"
        >
          <Plus className="w-5 h-5 mr-2" />
          添加第一个章节
        </Button>

        <div className="mt-8 text-xs text-zinc-500 space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span>可从小说项目中选择已生成的章节</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>自动化工作流：剧本 → 镜头 → 场景 → 漫画</span>
          </div>
        </div>
      </div>
    </div>
  );
}
