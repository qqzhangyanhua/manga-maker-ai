/**
 * 章节管理 Tab 组件
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BookOpen, Upload } from "lucide-react";
import { ChapterList } from "./components/ChapterList";
import { ChapterEditor } from "./components/ChapterEditor";
import { BatchImportDialog } from "./components/BatchImportDialog";
import type { NovelProject, ChapterOutline } from "./types";

interface ChaptersTabProps {
  project: NovelProject;
  outlines: ChapterOutline[];
  selectedChapter: ChapterOutline | null;
  loading: boolean;
  onCreateChapter: () => void;
  onSelectChapter: (chapter: ChapterOutline) => void;
  onUpdateChapter: (chapter: ChapterOutline) => void;
  onRefresh?: () => void;
}

export function ChaptersTab({
  project,
  outlines,
  selectedChapter,
  loading,
  onCreateChapter,
  onSelectChapter,
  onUpdateChapter,
  onRefresh,
}: ChaptersTabProps) {
  const [batchImportOpen, setBatchImportOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：章节列表 */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">章节列表</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchImportOpen(true)}
                    title="批量导入章节"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={onCreateChapter}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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

      {/* 批量导入对话框 */}
      <BatchImportDialog
        projectId={project.id}
        open={batchImportOpen}
        onOpenChange={setBatchImportOpen}
        onSuccess={onRefresh}
      />
    </>
  );
}
