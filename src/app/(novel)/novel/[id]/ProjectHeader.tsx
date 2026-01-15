/**
 * 项目头部组件
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Download, Film } from "lucide-react";
import { SearchDialog } from "./components/SearchDialog";
import { ExportDialog } from "./components/ExportDialog";
import { ConvertToComicDialog } from "./components/ConvertToComicDialog";
import type { NovelProject, ChapterOutline } from "./types";
import { toast } from "sonner";
import { novelTheme } from "../theme";
import { cn } from "@/lib/utils";

interface ProjectHeaderProps {
  project: NovelProject;
  projectId: string;
  outlines: ChapterOutline[];
  onSelectChapter: (chapter: ChapterOutline) => void;
}

export function ProjectHeader({
  project,
  projectId,
  outlines,
  onSelectChapter,
}: ProjectHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  // 添加快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/⌘ + K 打开搜索
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Ctrl/⌘ + E 打开导出
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        setExportOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectChapter = async (chapterId: string) => {
    const chapterNumber = parseInt(chapterId);
    if (!isNaN(chapterNumber)) {
      const chapter = outlines.find((outline) => outline.chapterNumber === chapterNumber);
      if (chapter) {
        onSelectChapter(chapter);
        toast.success(`已跳转到第 ${chapter.chapterNumber} 章`);
      }
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
          <p className="text-muted-foreground">
            {project.description || "暂无描述"}
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>{project.chapter_count} 章</span>
            <span>{project.total_words.toLocaleString()} 字</span>
            {project.genre && <span>{project.genre}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {/* 搜索按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className={cn("gap-2", novelTheme.button.outline)}
          >
            <Search className="w-4 h-4" />
            搜索
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-purple-500/30 bg-purple-500/5 px-1.5 font-mono text-[10px] font-medium text-purple-400">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* 导出按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportOpen(true)}
            className={cn("gap-2", novelTheme.button.outline)}
          >
            <Download className="w-4 h-4" />
            导出
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-purple-500/30 bg-purple-500/5 px-1.5 font-mono text-[10px] font-medium text-purple-400">
              <span className="text-xs">⌘</span>E
            </kbd>
          </Button>

          {/* 转换为漫画按钮 */}
          <Button
            size="sm"
            onClick={() => setConvertOpen(true)}
            className={cn("gap-2", novelTheme.button.primary)}
          >
            <Film className="w-4 h-4" />
            转换为漫画
          </Button>
        </div>
      </div>

      {/* 搜索对话框 */}
      <SearchDialog
        projectId={projectId}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectChapter={handleSelectChapter}
      />

      {/* 导出对话框 */}
      <ExportDialog
        projectId={projectId}
        projectTitle={project.title}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />

      {/* 转换为漫画对话框 */}
      <ConvertToComicDialog
        isOpen={convertOpen}
        onClose={() => setConvertOpen(false)}
        projectId={projectId}
        projectTitle={project.title}
        outlines={outlines}
        characters={Array.isArray(project.characters) ? project.characters as Array<{ name: string; role?: string; description?: string }> : []}
      />
    </div>
  );
}
