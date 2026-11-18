"use client";

/**
 * 排版编辑器页面客户端组件
 */

import Link from "next/link";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LayoutEditor } from "@/components/LayoutEditor";
import type { ComicPageData } from "@/types/layout";

interface LayoutEditorPageProps {
  projectId: string;
  projectName: string;
  initialPages: ComicPageData[];
}

export function LayoutEditorPage({
  projectId,
  projectName,
  initialPages,
}: LayoutEditorPageProps) {
  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-foreground overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link href={`/projects`}>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-medium text-zinc-100">{projectName}</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">排版编辑器</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                <div className="text-xs space-y-1">
                  <p><span className="text-orange-400">Ctrl+S</span>: 保存</p>
                  <p><span className="text-orange-400">Delete</span>: 删除选中对象</p>
                  <p><span className="text-orange-400">滚轮</span>: 缩放</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* 编辑器主体 */}
      <main className="flex-1 overflow-hidden relative bg-[#1a1a1a]">
        <LayoutEditor projectId={projectId} initialPages={initialPages} />
      </main>
    </div>
  );
}
