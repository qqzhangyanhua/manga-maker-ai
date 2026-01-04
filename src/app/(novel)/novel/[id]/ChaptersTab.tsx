/**
 * 章节管理 Tab 组件
 */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BookOpen } from "lucide-react";
import { ChapterList } from "./components/ChapterList";
import { ChapterEditor } from "./components/ChapterEditor";
import type { NovelProject, ChapterOutline } from "./types";

interface ChaptersTabProps {
  project: NovelProject;
  outlines: ChapterOutline[];
  selectedChapter: ChapterOutline | null;
  loading: boolean;
  onCreateChapter: () => void;
  onSelectChapter: (chapter: ChapterOutline) => void;
  onUpdateChapter: (chapter: ChapterOutline) => void;
}

export function ChaptersTab({
  project,
  outlines,
  selectedChapter,
  loading,
  onCreateChapter,
  onSelectChapter,
  onUpdateChapter,
}: ChaptersTabProps) {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* 左侧：章节列表 */}
      <div className="col-span-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">章节列表</CardTitle>
              <Button size="sm" onClick={onCreateChapter}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ChapterList
              chapters={outlines}
              selectedChapter={selectedChapter}
              onSelect={onSelectChapter}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>

      {/* 右侧：章节编辑器 */}
      <div className="col-span-9">
        {selectedChapter ? (
          <ChapterEditor
            chapter={selectedChapter}
            project={project}
            onUpdate={onUpdateChapter}
          />
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                选择一个章节开始编辑，或创建新章节
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
