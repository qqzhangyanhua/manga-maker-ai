/**
 * 项目头部组件
 */
"use client";

import { SearchDialog } from "./components/SearchDialog";
import { ExportDialog } from "./components/ExportDialog";
import type { NovelProject, ChapterOutline } from "./types";
import { toast } from "sonner";

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
          <SearchDialog
            projectId={projectId}
            onSelectChapter={handleSelectChapter}
          />
          <ExportDialog projectId={projectId} projectTitle={project.title} />
        </div>
      </div>
    </div>
  );
}
