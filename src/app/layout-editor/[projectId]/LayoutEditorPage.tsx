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
    <div className="h-screen flex flex-col bg-background">
      {/* 顶部导航栏 */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-medium">{projectName}</h1>
            <p className="text-xs text-muted-foreground">排版编辑器</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <p>Ctrl+S: 保存</p>
                  <p>Delete: 删除选中对象</p>
                  <p>滚轮: 缩放</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* 编辑器主体 */}
      <main className="flex-1 overflow-hidden">
        <LayoutEditor projectId={projectId} initialPages={initialPages} />
      </main>
    </div>
  );
}
